const { z } = require("zod");
const asyncHandler = require("../../utils/asyncHandler");
const sessionService = require("./session.service");

const createInterviewSchema = z.object({
  roleFocus: z.string().min(2),
  levelFocus: z.string().min(2)
});

const addEventSchema = z.object({
  eventType: z.string().min(3),
  payload: z.record(z.any())
});

const createInterview = asyncHandler(async (req, res) => {
  const payload = createInterviewSchema.parse(req.body);

  const session = await sessionService.createInterview({
    userId: req.user.sub,
    roleFocus: payload.roleFocus,
    levelFocus: payload.levelFocus
  });

  res.status(201).json({ data: session });
});

const getInterview = asyncHandler(async (req, res) => {
  const session = await sessionService.getInterview(req.params.id, req.user.sub);
  res.status(200).json({ data: session });
});

const addEvent = asyncHandler(async (req, res) => {
  const payload = addEventSchema.parse(req.body);

  const event = await sessionService.addEvent({
    sessionId: req.params.id,
    userId: req.user.sub,
    eventType: payload.eventType,
    payload: payload.payload
  });

  res.status(201).json({ data: event });
});

const getReport = asyncHandler(async (req, res) => {
  const report = await sessionService.getReport(req.params.id, req.user.sub);
  res.status(200).json({ data: report });
});

module.exports = {
  createInterview,
  getInterview,
  addEvent,
  getReport
};
