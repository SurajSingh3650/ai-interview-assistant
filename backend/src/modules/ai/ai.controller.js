const { z } = require("zod");

const asyncHandler = require("../../utils/asyncHandler");
const { generateAiHelp, streamAiHelp } = require("./ai.service");

const aiHelpSchema = z.object({
  transcript: z.string().min(1),
  context: z.object({
    role: z.string().optional(),
    company: z.string().optional(),
    speakingStyle: z.string().optional(),
    sessionId: z.string().optional()
  }).optional()
});

const createAiResponse = asyncHandler(async (req, res) => {
  const payload = aiHelpSchema.parse(req.body);
  const result = await generateAiHelp({
    ...payload,
    userId: req.user.sub
  });
  res.status(200).json({
    data: {
      answer: result.answer,
      bulletPoints: result.bulletPoints,
      speakingFormat: result.speakingFormat,
      cached: result.cached,
      model: result.model,
      provider: result.provider
    }
  });
});

const streamAiResponse = asyncHandler(async (req, res) => {
  const payload = aiHelpSchema.parse(req.body);

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const sendEvent = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("meta", {
    transcript: payload.transcript
  });

  try {
    const result = await streamAiHelp({
      ...payload,
      userId: req.user.sub,
      onDelta: async (delta) => {
        sendEvent("delta", { delta });
      }
    });

    sendEvent("final", {
      answer: result.answer,
      bulletPoints: result.bulletPoints,
      speakingFormat: result.speakingFormat,
      cached: result.cached,
      model: result.model,
      provider: result.provider
    });
    sendEvent("done", { ok: true });
  } catch (error) {
    sendEvent("error", {
      message: error.message || "Unable to stream AI response"
    });
  } finally {
    res.end();
  }
});

module.exports = {
  createAiResponse,
  streamAiResponse
};
