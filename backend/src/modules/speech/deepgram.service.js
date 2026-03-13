const WebSocket = require("ws");

const env = require("../../config/env");
const logger = require("../../config/logger");
const AppError = require("../../utils/AppError");

function createDeepgramStream({ sessionId, onTranscript, onError }) {
  if (!env.DEEPGRAM_API_KEY) {
    throw new AppError(500, "DEEPGRAM_NOT_CONFIGURED", "Deepgram API key is missing");
  }

  const url = new URL("wss://api.deepgram.com/v2/listen");
  url.searchParams.set("model", "flux-general-en");
  url.searchParams.set("language", "en-US");
  url.searchParams.set("interim_results", "true");
  url.searchParams.set("smart_format", "true");
  url.searchParams.set("vad_events", "true");
  url.searchParams.set("utterance_end_ms", "1000");
  url.searchParams.set("endpointing", "300");

  const socket = new WebSocket(url, {
    headers: {
      Authorization: `Token ${env.DEEPGRAM_API_KEY}`
    }
  });

  let isOpen = false;
  const pendingChunks = [];
  const keepAlive = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "KeepAlive" }));
    }
  }, 4000);

  socket.on("open", () => {
    isOpen = true;
    while (pendingChunks.length > 0) {
      socket.send(pendingChunks.shift());
    }
  });

  socket.on("message", (raw) => {
    try {
      const payload = JSON.parse(String(raw));
      if (payload.type !== "Results") {
        return;
      }

      const transcript = String(payload.channel?.alternatives?.[0]?.transcript || "").trim();
      if (!transcript) {
        return;
      }

      onTranscript({
        transcript,
        isFinal: Boolean(payload.is_final),
        speechFinal: Boolean(payload.speech_final),
        provider: "deepgram"
      });
    } catch (error) {
      logger.warn("Deepgram message parse failed", { sessionId, error: error.message });
    }
  });

  socket.on("error", (error) => {
    onError?.(error);
  });

  socket.on("close", () => {
    clearInterval(keepAlive);
  });

  return {
    sendAudioChunk(buffer) {
      if (!buffer || buffer.length === 0) {
        return;
      }

      if (!isOpen) {
        pendingChunks.push(buffer);
        return;
      }

      socket.send(buffer);
    },
    finalize() {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "Finalize" }));
      }
    },
    close() {
      clearInterval(keepAlive);
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "CloseStream" }));
      }
      socket.close();
    }
  };
}

module.exports = {
  createDeepgramStream
};
