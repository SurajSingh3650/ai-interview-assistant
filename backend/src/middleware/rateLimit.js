const env = require("../config/env");
const { redis } = require("../db/redis");
const AppError = require("../utils/AppError");

function createRateLimiter({ prefix, limit = env.AI_HELP_RATE_LIMIT, windowSec = env.AI_HELP_RATE_LIMIT_WINDOW_SEC }) {
  return async function rateLimit(req, _res, next) {
    const actor = req.user?.sub || req.ip || "anonymous";
    const key = `${prefix}:${actor}`;
    const count = await redis.incr(key);

    if (count === 1) {
      await redis.expire(key, windowSec);
    }

    if (count > limit) {
      throw new AppError(429, "RATE_LIMITED", "Too many requests. Please try again shortly.");
    }

    next();
  };
}

module.exports = {
  createRateLimiter
};
