const { redis } = require("../../db/redis");
const env = require("../../config/env");
const logger = require("../../config/logger");
const AppError = require("../../utils/AppError");
const { createDeepgramStream } = require("./deepgram.service");

const TTL_SEC = 60 * 30;
const providerSessions = new Map();
const streamListeners = new Map();

function streamKey(sessionId) {
  return `speech:${sessionId}:stream`;
}

function emitTranscriptUpdate(sessionId, payload) {
  const listeners = streamListeners.get(sessionId);
  if (!listeners?.size) {
    return;
  }

  for (const listener of listeners) {
    try {
      listener(payload);
    } catch (error) {
      logger.warn("Transcript listener failed", { sessionId, error: error.message });
    }
  }
}

function registerTranscriptListener(sessionId, listener) {
  const existing = streamListeners.get(sessionId) || new Set();
  existing.add(listener);
  streamListeners.set(sessionId, existing);

  return () => {
    const listeners = streamListeners.get(sessionId);
    if (!listeners) {
      return;
    }
    listeners.delete(listener);
    if (listeners.size === 0) {
      streamListeners.delete(sessionId);
    }
  };
}

function mergeFinalTranscript(existingTranscript, nextTranscript) {
  const previous = String(existingTranscript || "").trim();
  const incoming = String(nextTranscript || "").trim();

  if (!incoming) {
    return previous;
  }

  if (!previous) {
    return incoming;
  }

  if (previous.endsWith(incoming)) {
    return previous;
  }

  return `${previous} ${incoming}`.trim();
}

async function startStream({ sessionId, userId }) {
  const state = {
    sessionId,
    userId,
    transcript: "",
    partialTranscript: "",
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await redis.set(streamKey(sessionId), JSON.stringify(state), "EX", TTL_SEC);

  if (env.TRANSCRIPTION_PROVIDER === "deepgram") {
    const providerStream = createDeepgramStream({
      sessionId,
      onTranscript: async ({ transcript, isFinal, provider }) => {
        const next = await ingestAudioChunk({
          sessionId,
          transcript,
          isFinal
        });
        emitTranscriptUpdate(sessionId, {
          ...next,
          provider
        });
      },
      onError: (error) => {
        logger.warn("Deepgram stream failed", { sessionId, error: error.message });
        emitTranscriptUpdate(sessionId, {
          transcript: state.transcript,
          partialTranscript: state.partialTranscript,
          isFinal: false,
          provider: "deepgram",
          error: "Deepgram transcription failed"
        });
      }
    });

    providerSessions.set(sessionId, providerStream);
  }

  return state;
}

async function getStream(sessionId) {
  const raw = await redis.get(streamKey(sessionId));
  if (!raw) {
    return null;
  }

  return JSON.parse(raw);
}

async function saveStream(state) {
  await redis.set(
    streamKey(state.sessionId),
    JSON.stringify({
      ...state,
      updatedAt: new Date().toISOString()
    }),
    "EX",
    TTL_SEC
  );
}

async function ingestAudioChunk({ sessionId, transcriptChunk, transcript, partialTranscript, isFinal = false }) {
  const state = await getStream(sessionId);
  if (!state) {
    throw new AppError(400, "STREAM_NOT_STARTED", "Recording has not been started");
  }

  if (env.TRANSCRIPTION_PROVIDER === "stub" && !transcriptChunk && !transcript) {
    throw new AppError(501, "TRANSCRIPTION_NOT_CONFIGURED", "Speech transcription provider is not configured");
  }

  if (transcript) {
    const normalizedTranscript = String(transcript).trim();
    if (isFinal) {
      state.transcript = mergeFinalTranscript(state.transcript, normalizedTranscript);
      state.partialTranscript = normalizedTranscript;
    } else {
      state.partialTranscript = mergeFinalTranscript(state.transcript, normalizedTranscript);
    }
  } else if (partialTranscript) {
    state.partialTranscript = String(partialTranscript).trim();
  } else if (transcriptChunk) {
    const chunk = String(transcriptChunk).trim();
    if (chunk) {
      state.partialTranscript = state.partialTranscript
        ? `${state.partialTranscript} ${chunk}`.trim()
        : chunk;
      if (isFinal) {
        state.transcript = state.transcript
          ? `${state.transcript} ${chunk}`.trim()
          : chunk;
        state.partialTranscript = state.transcript;
      }
    }
  }

  await saveStream(state);

  return {
    transcript: state.transcript,
    partialTranscript: state.partialTranscript,
    isFinal
  };
}

async function ingestAudioBuffer({ sessionId, audioBase64 }) {
  const providerSession = providerSessions.get(sessionId);
  if (!providerSession) {
    throw new AppError(400, "STREAM_NOT_STARTED", "Audio transcription stream is not active");
  }

  if (!audioBase64) {
    throw new AppError(400, "INVALID_AUDIO_CHUNK", "Audio chunk is required");
  }

  const buffer = Buffer.from(String(audioBase64), "base64");
  providerSession.sendAudioChunk(buffer);

  const state = await getStream(sessionId);
  return {
    transcript: state?.transcript || "",
    partialTranscript: state?.partialTranscript || "",
    isFinal: false
  };
}

async function stopStream(sessionId) {
  const state = await getStream(sessionId);
  if (!state) {
    throw new AppError(400, "STREAM_NOT_STARTED", "Recording has not been started");
  }

  const providerSession = providerSessions.get(sessionId);
  if (providerSession) {
    providerSession.finalize();
    providerSession.close();
    providerSessions.delete(sessionId);
  }

  await saveStream(state);
  return {
    transcript: state.transcript || state.partialTranscript,
    partialTranscript: state.partialTranscript,
    isFinal: true
  };
}

module.exports = {
  startStream,
  getStream,
  ingestAudioChunk,
  ingestAudioBuffer,
  stopStream,
  registerTranscriptListener
};
