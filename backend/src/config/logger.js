const env = require("./env");

const levels = { debug: 10, info: 20, warn: 30, error: 40 };
const minLevel = levels[env.LOG_LEVEL] ?? levels.info;

function log(level, message, meta = {}) {
  if ((levels[level] ?? 100) < minLevel) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

module.exports = {
  debug: (message, meta) => log("debug", message, meta),
  info: (message, meta) => log("info", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  error: (message, meta) => log("error", message, meta)
};
