const http = require("http");

const app = require("./app");
const env = require("./config/env");
const logger = require("./config/logger");
const { initMongo, closeMongo } = require("./db/mongodb");
const { initRedis, closeRedis } = require("./db/redis");
const { createWsServer } = require("./modules/realtime/wsServer");

async function start() {
  await initMongo();
  await initRedis();

  const server = http.createServer(app);
  createWsServer(server);

  const closeResources = async () => {
    await closeRedis();
    await closeMongo();
  };

  let isShuttingDown = false;
  server.listen(env.PORT, () => {
    logger.info("Backend listening", { port: env.PORT, env: env.NODE_ENV });
  });

  server.on("error", async (error) => {
    if (error.code === "EADDRINUSE") {
      logger.error("Port already in use", { port: env.PORT });
    } else {
      logger.error("Server failed to start", { error: error.message });
    }

    await closeResources();
    process.exit(1);
  });

  const shutdown = async (signal) => {
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;

    logger.info("Shutdown signal received", { signal });
    server.close(async () => {
      await closeResources();
      logger.info("Shutdown complete");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error) => {
  logger.error("Startup failed", { error: error.message });
  process.exit(1);
});
