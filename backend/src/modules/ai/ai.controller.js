const { z } = require("zod");

const asyncHandler = require("../../utils/asyncHandler");
const { generateAiHelp } = require("./ai.service");

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

module.exports = {
  createAiResponse
};
