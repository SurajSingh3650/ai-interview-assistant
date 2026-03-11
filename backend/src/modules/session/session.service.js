const { v4: uuidv4 } = require("uuid");
const { getCollections } = require("../../db/mongodb");
const { redis } = require("../../db/redis");
const AppError = require("../../utils/AppError");

async function createInterview({ userId, roleFocus, levelFocus }) {
  const { interviewSessions, interviewHistories } = getCollections();
  const id = uuidv4();
  const now = new Date();

  await interviewSessions.insertOne({
    id,
    userId,
    roleFocus,
    levelFocus,
    status: "active",
    createdAt: now
  });

  await interviewHistories.insertOne({
    id: uuidv4(),
    userId,
    sessionId: id,
    transcript: [],
    aiResponses: [],
    metadata: {
      roleFocus,
      levelFocus,
      modelRealtime: process.env.AI_MODEL_REALTIME || "unknown"
    },
    createdAt: now,
    updatedAt: now
  });

  await redis.set(`session:${id}:meta`, JSON.stringify({ id, userId, roleFocus, levelFocus }), "EX", 60 * 60 * 6);

  return { id, roleFocus, levelFocus, status: "active" };
}

async function getInterview(sessionId, userId) {
  const { interviewSessions } = getCollections();
  const session = await interviewSessions.findOne({ id: sessionId });

  if (!session) {
    throw new AppError(404, "SESSION_NOT_FOUND", "Interview session not found");
  }

  if (session.userId !== userId) {
    throw new AppError(403, "SESSION_FORBIDDEN", "You do not have access to this session");
  }

  return {
    id: session.id,
    userId: session.userId,
    roleFocus: session.roleFocus,
    levelFocus: session.levelFocus,
    status: session.status,
    createdAt: session.createdAt
  };
}

async function addEvent({ sessionId, userId, eventType, payload }) {
  const { interviewEvents, interviewHistories } = getCollections();
  await getInterview(sessionId, userId);

  const eventId = uuidv4();
  const now = new Date();
  await interviewEvents.insertOne({
    id: eventId,
    sessionId,
    eventType,
    payload,
    createdAt: now
  });

  const historyPatch = {
    $set: { updatedAt: now }
  };

  if (eventType === "candidate.transcript") {
    historyPatch.$push = {
      transcript: {
        id: eventId,
        role: "candidate",
        text: String(payload?.transcript || ""),
        createdAt: now
      }
    };
  } else if (eventType.startsWith("coach.")) {
    historyPatch.$push = {
      aiResponses: {
        id: eventId,
        type: eventType,
        hint: payload?.hint || "",
        followupQuestion: payload?.followupQuestion || "",
        confidenceDelta: Number(payload?.confidenceDelta || 0),
        createdAt: now
      }
    };
  }

  await interviewHistories.updateOne({ sessionId }, historyPatch);

  await redis.rpush(`session:${sessionId}:events`, JSON.stringify({ id: eventId, eventType, payload }));
  await redis.expire(`session:${sessionId}:events`, 60 * 60 * 6);

  return { id: eventId, sessionId, eventType };
}

async function getReport(sessionId, userId) {
  const { interviewEvents } = getCollections();
  await getInterview(sessionId, userId);

  const events = await interviewEvents
    .find({ sessionId }, { projection: { _id: 0, eventType: 1, payload: 1, createdAt: 1 } })
    .sort({ createdAt: 1 })
    .toArray();

  const totalEvents = events.length;
  const transcriptEvents = events.filter((row) => row.eventType === "candidate.transcript").length;
  const coachEvents = events.filter((row) => row.eventType.startsWith("coach.")).length;

  return {
    sessionId,
    summary: {
      totalEvents,
      transcriptEvents,
      coachEvents
    },
    latestEvents: events.slice(-10)
  };
}

module.exports = {
  createInterview,
  getInterview,
  addEvent,
  getReport
};
