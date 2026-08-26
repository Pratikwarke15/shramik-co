import Redis from "ioredis";

let redis: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redis) return redis;
  const url = process.env.REDIS_URL;
  if (!url || url.includes("localhost")) {
    console.log("[Redis] No Redis URL configured, running without cache");
    return null;
  }
  try {
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 10) return null;
        return Math.min(times * 200, 3000);
      },
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    redis.on("error", () => {});
    redis.on("connect", () => console.log("[Redis] Connected"));
    redis.connect().catch(() => {});
    return redis;
  } catch {
    return null;
  }
}

export function getRedis(): Redis | null {
  return getRedisClient();
}

export const redis = new Proxy({} as Redis, {
  get(_target, prop) {
    const client = getRedisClient();
    if (!client) {
      if (prop === "get" || prop === "set" || prop === "del" || prop === "exists") {
        return async () => null;
      }
      return () => {};
    }
    return (client as any)[prop];
  },
});

export default redis;
