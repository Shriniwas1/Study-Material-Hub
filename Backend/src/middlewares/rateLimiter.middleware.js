import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import { redisClient, isRedisAvailable } from "../config/redis.js";

const getStore = (prefix) => {
  if (redisClient) {
    return new RedisStore({
      sendCommand: async (...args) => {
        if (!isRedisAvailable()) {
          return null;
        }
        return await redisClient.call(...args);
      },
      prefix: `rl:${prefix}:`
    });
  }
  return undefined;
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.AUTH_RATE_LIMIT || "10", 10),
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore("auth"),
  passOnStoreError: true
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT || "200", 10),
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore("api"),
  passOnStoreError: true
});

export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || "15", 10),
  message: { error: "Upload quota exceeded. Maximum 15 uploads per hour allowed." },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore("upload"),
  passOnStoreError: true
});

export const chatRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.CHAT_RATE_LIMIT || "20", 10),
  message: { error: "AI rate limit exceeded. Please wait a minute before sending more questions." },
  standardHeaders: true,
  legacyHeaders: false,
  store: getStore("chat"),
  passOnStoreError: true
});
