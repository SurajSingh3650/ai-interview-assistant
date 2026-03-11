const crypto = require("crypto");

const env = require("../../config/env");
const logger = require("../../config/logger");
const { redis } = require("../../db/redis");
const AppError = require("../../utils/AppError");
const { getInterview } = require("../session/session.service");
const { getOpenRouterClient } = require("./openRouterClient");

const CACHE_TTL_SEC = 60 * 10;
const CACHE_VERSION = "v3";
const SESSION_MEMORY_ROLE_USER = "user";
const SESSION_MEMORY_ROLE_ASSISTANT = "assistant";

function normalizeTranscript(transcript) {
  return String(transcript || "").trim().replace(/\s+/g, " ");
}

function buildSystemPrompt(context = {}, memoryTurns = []) {
  const speakingStyle = context.speakingStyle || "short speaking format";
  const role = context.role || "general interview";
  const company = context.company || "the company";
  const memoryBlock = memoryTurns.length
    ? [
        "Conversation memory:",
        ...memoryTurns.map((turn) => `${turn.role === SESSION_MEMORY_ROLE_ASSISTANT ? "Assistant" : "Candidate"}: ${turn.content}`)
      ].join("\n")
    : "Conversation memory:\nNone";

  return [
    "You are an interview answer assistant.",
    "Return JSON only with keys: answer, bulletPoints, speakingFormat.",
    "Rules:",
    "- answer must be under 80 words",
    "- professional, confident, natural to say aloud",
    "- no markdown and no extra commentary",
    "- if the current question refers to a previous topic, use the conversation memory to resolve it",
    `- speaking style: ${speakingStyle}`,
    `- role context: ${role}`,
    `- company context: ${company}`,
    memoryBlock
  ].join("\n");
}

function cacheKeyForTranscript(transcript, context = {}, memoryTurns = []) {
  const cacheContext = {
    role: context.role || "",
    company: context.company || "",
    speakingStyle: context.speakingStyle || "",
    memoryTurns
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({ transcript, context: cacheContext, provider: env.AI_PROVIDER, model: env.OPENROUTER_MODEL, version: CACHE_VERSION }))
    .digest("hex");

  return `ai-help:${hash}`;
}

function sessionMemoryKey(sessionId) {
  return `session:${sessionId}:ai-memory`;
}

function normalizeMemoryTurns(rawTurns) {
  return rawTurns
    .map((entry) => {
      try {
        const parsed = JSON.parse(entry);
        const role = parsed.role === SESSION_MEMORY_ROLE_ASSISTANT ? SESSION_MEMORY_ROLE_ASSISTANT : SESSION_MEMORY_ROLE_USER;
        const content = normalizeTranscript(parsed.content);

        if (!content) {
          return null;
        }

        return {
          role,
          content
        };
      } catch (_error) {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-env.SESSION_MEMORY_MAX_TURNS * 2);
}

async function getSessionMemory(sessionId) {
  if (!sessionId) {
    return [];
  }

  const rawTurns = await redis.lrange(sessionMemoryKey(sessionId), 0, -1);
  return normalizeMemoryTurns(rawTurns);
}

async function appendSessionMemory(sessionId, transcript, aiResult) {
  if (!sessionId) {
    return;
  }

  const normalizedTranscript = normalizeTranscript(transcript);
  const normalizedSpeakingFormat = normalizeTranscript(aiResult?.speakingFormat || aiResult?.answer);

  if (!normalizedTranscript || !normalizedSpeakingFormat) {
    return;
  }

  await redis.rpush(
    sessionMemoryKey(sessionId),
    JSON.stringify({ role: SESSION_MEMORY_ROLE_USER, content: normalizedTranscript }),
    JSON.stringify({ role: SESSION_MEMORY_ROLE_ASSISTANT, content: normalizedSpeakingFormat })
  );
  await redis.ltrim(sessionMemoryKey(sessionId), -env.SESSION_MEMORY_MAX_TURNS * 2, -1);
  await redis.expire(sessionMemoryKey(sessionId), env.SESSION_MEMORY_TTL_SEC);
}

function fallbackHelp(transcript) {
  return {
    answer: "I'm interested in this opportunity because my experience aligns well with the role, and I can contribute quickly while continuing to learn and grow with the team.",
    bulletPoints: [
      "Relevant experience matches the role",
      "Can contribute quickly",
      "Strong motivation to learn and grow"
    ],
    speakingFormat: "My background fits this role well. I can add value quickly, and I'm motivated by the chance to grow while contributing to the team.",
    model: "fallback",
    provider: "fallback",
    cached: false,
    sourceTranscript: transcript
  };
}

function parseAiPayload(payloadText, transcript) {
  const normalizedPayload = normalizeTranscript(payloadText);

  if (!normalizedPayload) {
    return fallbackHelp(transcript);
  }

  try {
    const jsonCandidate = normalizedPayload.match(/\{.*\}/)?.[0] || normalizedPayload;
    const parsed = JSON.parse(jsonCandidate);
    const answer = normalizeTranscript(parsed.answer);
    const bulletPoints = Array.isArray(parsed.bulletPoints)
      ? parsed.bulletPoints.map((item) => normalizeTranscript(item)).filter(Boolean).slice(0, 4)
      : [];
    const speakingFormat = normalizeTranscript(parsed.speakingFormat);

    if (!answer) {
      throw new Error("Missing answer");
    }

    return {
      answer,
      bulletPoints,
      speakingFormat: speakingFormat || answer,
      sourceTranscript: transcript
    };
  } catch (error) {
    logger.warn("AI response parsing failed", { error: error.message, provider: env.AI_PROVIDER });
    return {
      answer: normalizedPayload,
      bulletPoints: [],
      speakingFormat: normalizedPayload,
      sourceTranscript: transcript
    };
  }
}

async function getCachedResponse(key) {
  const raw = await redis.get(key);
  if (!raw) {
    return null;
  }

  const parsed = JSON.parse(raw);
  return { ...parsed, cached: true };
}

async function setCachedResponse(key, payload) {
  await redis.set(key, JSON.stringify(payload), "EX", CACHE_TTL_SEC);
}

async function generateWithOpenRouter(transcript, context, memoryTurns) {
  const client = getOpenRouterClient();
  if (!client) {
    return null;
  }

  const completion = await client.chat.send({
    chatGenerationParams: {
      model: env.OPENROUTER_MODEL,
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(context, memoryTurns)
        },
        {
          role: "user",
          content: `Question or transcript: ${transcript}`
        }
      ],
      stream: false,
      temperature: 0.3,
      maxCompletionTokens: 180,
      responseFormat: {
        type: "json_object"
      }
    }
  });

  const rawText = String(completion?.choices?.[0]?.message?.content || "").trim();

  return {
    rawText,
    model: env.OPENROUTER_MODEL,
    provider: "openrouter"
  };
}

async function resolveSessionMemoryContext({ userId, context }) {
  const sessionId = normalizeTranscript(context?.sessionId);
  if (!sessionId) {
    return { sessionId: null, memoryTurns: [] };
  }

  if (!userId) {
    throw new AppError(401, "AUTH_REQUIRED", "User session is required for conversation memory");
  }

  await getInterview(sessionId, userId);
  const memoryTurns = await getSessionMemory(sessionId);
  return { sessionId, memoryTurns };
}

async function generateAiHelp({ transcript, context = {}, userId }) {
  const normalizedTranscript = normalizeTranscript(transcript);
  if (!normalizedTranscript) {
    throw new AppError(400, "INVALID_TRANSCRIPT", "Transcript is required");
  }

  const { sessionId, memoryTurns } = await resolveSessionMemoryContext({ userId, context });
  const effectiveContext = {
    role: context.role,
    company: context.company,
    speakingStyle: context.speakingStyle
  };
  const key = cacheKeyForTranscript(normalizedTranscript, effectiveContext, memoryTurns);
  const cached = await getCachedResponse(key);
  if (cached) {
    await appendSessionMemory(sessionId, normalizedTranscript, cached);
    return cached;
  }

  const providerResponse = env.AI_PROVIDER === "openrouter"
    ? await generateWithOpenRouter(normalizedTranscript, effectiveContext, memoryTurns)
    : null;

  if (!providerResponse) {
    const payload = fallbackHelp(normalizedTranscript);
    await appendSessionMemory(sessionId, normalizedTranscript, payload);
    await setCachedResponse(key, payload);
    return payload;
  }

  const parsed = parseAiPayload(providerResponse.rawText, normalizedTranscript);
  const payload = {
    ...parsed,
    model: providerResponse.model,
    provider: providerResponse.provider,
    cached: false
  };

  await appendSessionMemory(sessionId, normalizedTranscript, payload);
  await setCachedResponse(key, payload);
  return payload;
}

module.exports = {
  generateAiHelp
};
