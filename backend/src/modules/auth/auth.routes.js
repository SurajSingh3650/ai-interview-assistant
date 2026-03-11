const express = require("express");
const authController = require("./auth.controller");
const authGuard = require("../../middleware/auth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/realtime/token", authGuard, authController.createRealtimeToken);
router.post("/logout", authGuard, authController.logout);
router.get("/history", authGuard, authController.getHistory);

module.exports = router;
