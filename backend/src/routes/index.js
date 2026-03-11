const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const aiRoutes = require("../modules/ai/ai.routes");
const sessionRoutes = require("../modules/session/session.routes");
const authGuard = require("../middleware/auth");
const authController = require("../modules/auth/auth.controller");

const router = express.Router();

// Backward-compatible alias described in README flow.
router.post("/realtime/token", authGuard, authController.createRealtimeToken);
router.use("/auth", authRoutes);
router.use(aiRoutes);
router.use("/interviews", sessionRoutes);

module.exports = router;
