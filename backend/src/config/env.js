const { z } = require("zod");
require("dotenv").config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  MONGODB_URL: z.string().min(1, "MONGODB_URL is required"),
  MONGODB_DB_NAME: z.string().min(1).default("aicopilot"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  REALTIME_TOKEN_EXPIRES_IN: z.string().default("10m"),
  OPENROUTER_API_KEY: z.string().optional(),
  OPENROUTER_MODEL: z.string().default("openai/gpt-5.2"),
  OPENROUTER_SITE_URL: z.string().optional(),
  OPENROUTER_SITE_NAME: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_STREAM_MODEL: z.string().default("gpt-4.1-mini"),
  AI_TIMEOUT_MS: z.coerce.number().default(15000),
  AI_HELP_RATE_LIMIT: z.coerce.number().default(30),
  AI_HELP_RATE_LIMIT_WINDOW_SEC: z.coerce.number().default(60),
  SESSION_MEMORY_TTL_SEC: z.coerce.number().default(60 * 60 * 6),
  SESSION_MEMORY_MAX_TURNS: z.coerce.number().default(6),
  TRANSCRIPTION_PROVIDER: z.enum(["browser", "deepgram", "assemblyai", "pass_through", "stub"]).default("browser"),
  DEEPGRAM_API_KEY: z.string().optional(),
  ASSEMBLYAI_API_KEY: z.string().optional(),
  AI_PROVIDER: z.enum(["openai", "openrouter", "placeholder"]).default("placeholder"),
  AI_MODEL_REALTIME: z.string().default("gpt-4o-mini-realtime"),
  AI_MODEL_ANALYSIS: z.string().default("gpt-4.1-mini"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const errors = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
  throw new Error(`Invalid environment configuration:\n${errors.join("\n")}`);
}

module.exports = parsed.data;
