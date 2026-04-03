import app from "./app";
import { PORT, NODE_ENV } from "./config/envConfig";
import redis, { disconnectRedis } from "./config/redisConfig";
import logger from "./config/loggerConfig";

await app.listen({ port: PORT }, async (err, add) => {
  err && logger.error(err.message);
  logger.info(`AuthService started`);
  await redis.connect();
  logger.info(`   Redis      : ${"Ram installed"}`);
  logger.info(`   Environment : ${NODE_ENV}`);
  logger.info(`   Port        : ${PORT}`);
  logger.info(`   Address     : ${add}`);
  logger.info(`   Health      : ${add}/health`);
  logger.info(`   API Base    : ${add}/api/v1`);
});

async function gracefulShutdown(signal: string) {
  logger.info(`\n Received ${signal}. Shutting down gracefully…`);

  await app.close(async () => {
    logger.info("HTTP server closed.");

    try {
      await disconnectRedis();
    } catch (err) {
      logger.error("Error dismounting RAM", { error: err });
    }

    logger.info("All connections closed. Goodbye!");
    process.exit(0);
  });

  setTimeout(() => {
    logger.error("Shutdown timed out. Forcing exit.");
    process.exit(1);
  }, 10_000);
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

process.on("unhandledRejection", (reason: any) => {
  logger.error("Unhandled Rejection", { error: reason?.message || reason });
});

process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception", {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
