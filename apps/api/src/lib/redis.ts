import Redis from "ioredis";

let redisClient: Redis | null = null;

function createRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url || url.includes("localhost")) {
    console.log("[Redis] No Redis URL configured, running without cache");
    return null;
  }
  try {
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redisClient.on("error", () => {});
    redisClient.on("connect", () => console.log("[Redis] Connected"));
    redisClient.connect().catch(() => {});
    return redisClient;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  return createRedisClient();
}

export { createRedisClient as redis };
export default createRedisClient;
