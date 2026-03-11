const Redis = require("ioredis");
const env = require("../config/env");
const logger = require("../config/logger");

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  lazyConnect: true,
  enableReadyCheck: true
});

redis.on("error", (error) => logger.error("Redis error", { error: error.message }));

async function initRedis() {
  await redis.connect();
  await redis.ping();
  logger.info("Redis initialized");
}

async function closeRedis() {
  if (redis.status === "ready") {
    await redis.quit();
  }
}

module.exports = {
  redis,
  initRedis,
  closeRedis
};
