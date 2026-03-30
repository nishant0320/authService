import Redis from "ioredis";
import { REDIS_URL } from "./serverConfig";
import logger from "./loggerConfig";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    logger.warn(`Redis reconnecting... attempt ${times}, delay ${delay}ms`);
    return delay;
  },
  enableReadyCheck: true,
  lazyConnect: false,
});
