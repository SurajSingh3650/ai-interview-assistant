const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const env = require("../../config/env");
const logger = require("../../config/logger");
const { getCollections } = require("../../db/mongodb");
const { redis } = require("../../db/redis");
const { validateRealtimeClaims } = require("../auth/sessionAuth");
const { generateAiHelp } = require("../ai/ai.service");
const {
  startStream,
  ingestAudioChunk,
  stopStream,
  getStream
} = require("../speech/transcription.service");

async function appendSessionEvent({ sessionId, eventType, payload }) {
  const { interviewEvents, interviewHistories } = getCollections();
  const eventId = uuidv4();
  const now = new Date();

  await interviewEvents.insertOne({
    id: eventId,
    sessionId,
    eventType,
    payload,
    createdAt: now
  });

  await redis.rpush(`session:${sessionId}:events`, JSON.stringify({ id: eventId, eventType, payload }));
  await redis.expire(`session:${sessionId}:events`, 60 * 60 * 6);

  const update = {
    $set: { updatedAt: now }
  };

  if (eventType === "transcript_update") {
    update.$push = {
      transcript: {
        id: eventId,
        role: "candidate",
        text: String(payload.transcript || payload.partialTranscript || ""),
        isFinal: Boolean(payload.isFinal),
        createdAt: now
      }
    };
  }

  if (eventType === "ai_response") {
    update.$push = {
      aiResponses: {
        id: eventId,
        type: "ai_response",
        answer: payload.answer,
        bulletPoints: payload.bulletPoints,
        speakingFormat: payload.speakingFormat,
        cached: payload.cached,
        model: payload.model,
        createdAt: now
      }
    };
  }

  await interviewHistories.updateOne({ sessionId }, update);
}

function send(ws, type, payload = {}) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

async function resolveSessionForSocket(req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname !== "/realtime") {
    return null;
  }

  const token = url.searchParams.get("token");
  const sessionId = url.searchParams.get("sessionId");

  if (!token || !sessionId) {
    return null;
  }

  const claims = jwt.verify(token, env.JWT_SECRET);
  await validateRealtimeClaims(claims);

  const { interviewSessions } = getCollections();
  const session = await interviewSessions.findOne({ id: sessionId });

  if (!session || session.userId !== claims.sub) {
    return null;
  }

  return { claims, session };
}

function createWsServer(httpServer) {
  const wsServer = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", async (req, socket, head) => {
    try {
      const resolved = await resolveSessionForSocket(req);
      if (!resolved) {
        socket.destroy();
        return;
      }

      req.user = resolved.claims;
      req.session = resolved.session;

      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit("connection", ws, req);
      });
    } catch (error) {
      logger.warn("WebSocket upgrade rejected", { reason: error.message });
      socket.destroy();
    }
  });

  wsServer.on("connection", (ws, req) => {
    const connectionId = uuidv4();
    const sessionId = req.session.id;

    logger.info("WebSocket connected", { connectionId, sessionId, userId: req.user.sub });

    const heartbeat = setInterval(() => {
      send(ws, "heartbeat", { ts: new Date().toISOString() });
    }, 25000);

    ws.on("message", async (rawMessage) => {
      try {
        await validateRealtimeClaims(req.user);

        const message = JSON.parse(String(rawMessage));
        const type = String(message.type || "");
        const payload = message.payload || {};

        switch (type) {
          case "start_recording": {
            await startStream({ sessionId, userId: req.user.sub });
            send(ws, "transcript_update", {
              transcript: "",
              partialTranscript: "",
              isFinal: false
            });
            break;
          }

          case "audio_stream": {
            const update = await ingestAudioChunk({
              sessionId,
              transcriptChunk: payload.transcriptChunk,
              transcript: payload.transcript,
              isFinal: Boolean(payload.isFinal)
            });

            await appendSessionEvent({
              sessionId,
              eventType: "transcript_update",
              payload: update
            });

            send(ws, "transcript_update", update);
            break;
          }

          case "stop_recording": {
            const update = await stopStream(sessionId);

            await appendSessionEvent({
              sessionId,
              eventType: "transcript_update",
              payload: update
            });

            send(ws, "transcript_update", update);
            break;
          }

          case "request_ai_help": {
            const stream = await getStream(sessionId);
            const transcript = String(payload.transcript || stream?.transcript || stream?.partialTranscript || "").trim();

            const result = await generateAiHelp({
              transcript,
              context: {
                role: req.session.roleFocus,
                sessionId,
                speakingStyle: "short speaking format"
              },
              userId: req.user.sub
            });

            await appendSessionEvent({
              sessionId,
              eventType: "ai_response",
              payload: result
            });

            send(ws, "ai_response", result);
            break;
          }

          case "candidate.transcript": {
            const update = await ingestAudioChunk({
              sessionId,
              transcript: payload.transcript,
              isFinal: true
            });

            await appendSessionEvent({
              sessionId,
              eventType: "transcript_update",
              payload: update
            });

            send(ws, "transcript_update", update);
            break;
          }

          default:
            send(ws, "system.error", { message: "Unsupported event type" });
        }
      } catch (error) {
        logger.warn("WebSocket message handling failed", { error: error.message, sessionId });

        if (error.code === "SESSION_REVOKED" || /session has expired/i.test(error.message)) {
          send(ws, "system.error", { message: "Session expired. Please login again." });
          ws.close();
          return;
        }

        send(ws, "system.error", { message: error.message || "Unable to process message" });
      }
    });

    ws.on("close", () => {
      clearInterval(heartbeat);
      logger.info("WebSocket disconnected", { connectionId, sessionId });
    });
  });

  return wsServer;
}

module.exports = {
  createWsServer
};
