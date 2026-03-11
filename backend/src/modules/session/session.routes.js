const express = require("express");
const authGuard = require("../../middleware/auth");
const sessionController = require("./session.controller");

const router = express.Router();

router.use(authGuard);
router.post("/", sessionController.createInterview);
router.get("/:id", sessionController.getInterview);
router.post("/:id/events", sessionController.addEvent);
router.get("/:id/report", sessionController.getReport);

module.exports = router;
