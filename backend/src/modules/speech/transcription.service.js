const { redis } = require("../../db/redis");
const env = require("../../config/env");
const AppError = require("../../utils/AppError");

const TTL_SEC = 60 * 30;

function streamKey(sessionId) {
  return `speech:${sessionId}:stream`;
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

async function ingestAudioChunk({ sessionId, transcriptChunk, transcript, isFinal = false }) {
  const state = await getStream(sessionId);
  if (!state) {
    throw new AppError(400, "STREAM_NOT_STARTED", "Recording has not been started");
  }

  if (env.TRANSCRIPTION_PROVIDER === "stub" && !transcriptChunk && !transcript) {
    throw new AppError(501, "TRANSCRIPTION_NOT_CONFIGURED", "Speech transcription provider is not configured");
  }

  if (transcript) {
    state.transcript = String(transcript).trim();
    state.partialTranscript = isFinal ? state.transcript : state.partialTranscript;
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

async function stopStream(sessionId) {
  const state = await getStream(sessionId);
  if (!state) {
    throw new AppError(400, "STREAM_NOT_STARTED", "Recording has not been started");
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
  stopStream
};
