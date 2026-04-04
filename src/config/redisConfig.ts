import Redis from "ioredis";
import { REDIS_URL } from "./envKeys";
import logger from "./loggerConfig";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: true,
});

redis.on("connect", () => logger.info("Redis connected"));
redis.on("error", (err) => logger.error("Redis error", { error: err.message }));
redis.on("close", () => logger.warn("Redis connection closed"));

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info("Redis disconnected gracefully.");
}

export default redis;
