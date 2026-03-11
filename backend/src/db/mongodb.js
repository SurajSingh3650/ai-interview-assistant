const { MongoClient } = require("mongodb");
const env = require("../config/env");
const logger = require("../config/logger");

const client = new MongoClient(env.MONGODB_URL);

let database = null;

function getDb() {
  if (!database) {
    throw new Error("MongoDB is not initialized");
  }

  return database;
}

function getCollections() {
  const db = getDb();
  return {
    users: db.collection("users"),
    userSessions: db.collection("user_sessions"),
    interviewSessions: db.collection("interview_sessions"),
    interviewEvents: db.collection("interview_events"),
    interviewHistories: db.collection("interview_histories")
  };
}

async function initMongo() {
  await client.connect();
  database = client.db(env.MONGODB_DB_NAME);

  const { users, userSessions, interviewSessions, interviewEvents, interviewHistories } = getCollections();

  await Promise.all([
    users.createIndex({ id: 1 }, { unique: true }),
    users.createIndex({ email: 1 }, { unique: true }),
    userSessions.createIndex({ id: 1 }, { unique: true }),
    userSessions.createIndex({ userId: 1, isActive: 1 }),
    userSessions.createIndex({ tokenId: 1 }, { unique: true }),
    interviewSessions.createIndex({ id: 1 }, { unique: true }),
    interviewSessions.createIndex({ userId: 1, createdAt: -1 }),
    interviewEvents.createIndex({ id: 1 }, { unique: true }),
    interviewEvents.createIndex({ sessionId: 1, createdAt: 1 }),
    interviewHistories.createIndex({ id: 1 }, { unique: true }),
    interviewHistories.createIndex({ sessionId: 1 }, { unique: true }),
    interviewHistories.createIndex({ userId: 1, createdAt: -1 })
  ]);

  logger.info("MongoDB initialized", { dbName: env.MONGODB_DB_NAME });
}

async function closeMongo() {
  await client.close();
}

module.exports = {
  getDb,
  getCollections,
  initMongo,
  closeMongo
};
