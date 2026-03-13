const express = require("express");

const authGuard = require("../../middleware/auth");
const { createRateLimiter } = require("../../middleware/rateLimit");
const aiController = require("./ai.controller");

const router = express.Router();

router.post(
  "/ai-help",
  authGuard,
  createRateLimiter({ prefix: "rate:ai-help" }),
  aiController.createAiResponse
);

router.post(
  "/ai-help/stream",
  authGuard,
  createRateLimiter({ prefix: "rate:ai-help" }),
  aiController.streamAiResponse
);

router.post(
  "/ai-response",
  authGuard,
  createRateLimiter({ prefix: "rate:ai-help" }),
  aiController.createAiResponse
);

module.exports = router;
