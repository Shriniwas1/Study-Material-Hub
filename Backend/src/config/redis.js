// src/config/redis.js
import Redis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

let redisClient = null;
let isConnected = false;

try {
  redisClient = new Redis(redisUrl, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    retryStrategy(times) {
      if (times > 2) return null; // Stop retrying if Redis is not running
      return 500;
    }
  });

  // Attach error handler to prevent unhandled EventEmitter error crashes
  redisClient.on("error", (err) => {
    isConnected = false;
    if (err.code !== "ECONNREFUSED") {
      console.warn(`[REDIS NOTICE] Redis client error: ${err.message}`);
    }
  });

  redisClient.on("connect", () => {
    isConnected = true;
    console.log("⚡ [REDIS] Connected to Redis successfully.");
  });

  redisClient.on("ready", () => {
    isConnected = true;
  });

  redisClient.on("close", () => {
    isConnected = false;
  });

  // Attempt initial non-blocking connection
  redisClient.connect().then(() => {
    isConnected = true;
  }).catch((err) => {
    isConnected = false;
    // In local development where Redis server may not be running, notify gracefully
    console.log("ℹ️ [REDIS INFO] Redis server is not currently running. System is operating with high-performance MongoDB/in-memory fallback.");
  });
} catch (error) {
  isConnected = false;
  console.warn(`[REDIS] Failed to initialize Redis client: ${error.message}`);
}

export const isRedisAvailable = () => {
  return isConnected && redisClient && redisClient.status === "ready";
};

export { redisClient };

/**
 * Get cached JSON value by key
 */
export const getCache = async (key) => {
  if (!isRedisAvailable()) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    return null;
  }
};

/**
 * Set cached JSON value with TTL in seconds
 */
export const setCache = async (key, value, ttlSeconds = 3600) => {
  if (!isRedisAvailable()) return false;
  try {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Delete keys matching a pattern (e.g., session invalidation)
 */
export const delCachePattern = async (pattern) => {
  if (!isRedisAvailable()) return false;
  try {
    const stream = redisClient.scanStream({ match: pattern, count: 50 });
    stream.on("data", async (keys) => {
      if (keys.length > 0) {
        const pipeline = redisClient.pipeline();
        keys.forEach((k) => pipeline.del(k));
        await pipeline.exec();
      }
    });
    return true;
  } catch (err) {
    return false;
  }
};

/**
 * Deduplication check acceleration: Check if a hash exists in a set.
 * If present, returns true (duplicate).
 * If not present, adds it to the set and returns false (new item).
 */
export const checkAndAddDedupHash = async (setKey, hash, ttlSeconds = 86400 * 30) => {
  if (!isRedisAvailable()) return { exists: false, isAvailable: false };
  try {
    const exists = await redisClient.sismember(setKey, hash);
    if (exists) {
      return { exists: true, isAvailable: true };
    }
    await redisClient.sadd(setKey, hash);
    if (ttlSeconds > 0) {
      await redisClient.expire(setKey, ttlSeconds);
    }
    return { exists: false, isAvailable: true };
  } catch (err) {
    return { exists: false, isAvailable: false };
  }
};

/**
 * Session/quota tracking: Increment a counter with TTL.
 * Returns the current count after increment.
 */
export const incrementQuotaCounter = async (key, ttlSeconds = 86400) => {
  if (!isRedisAvailable()) return null;
  try {
    const count = await redisClient.incr(key);
    if (count === 1 && ttlSeconds > 0) {
      await redisClient.expire(key, ttlSeconds);
    }
    return count;
  } catch (err) {
    return null;
  }
};

/**
 * Get current quota counter
 */
export const getQuotaCounter = async (key) => {
  if (!isRedisAvailable()) return null;
  try {
    const count = await redisClient.get(key);
    return count ? parseInt(count, 10) : 0;
  } catch (err) {
    return null;
  }
};
