import dotenv from "dotenv";
dotenv.config(); // Load this first

import express from "express";
import cors from "cors";
import helmet from "helmet";
// express-mongo-sanitize is incompatible with Express 5 (req.query is read-only).
// Using a custom body-only sanitizer instead.
const sanitizeValue = (val) => {
  if (Array.isArray(val)) return val.map(sanitizeValue);
  if (val !== null && typeof val === "object") {
    return Object.fromEntries(
      Object.entries(val)
        .filter(([k]) => !k.startsWith("$") && !k.includes("."))
        .map(([k, v]) => [k, sanitizeValue(v)])
    );
  }
  return val;
};
const mongoBodySanitize = (req, _res, next) => {
  if (req.body) req.body = sanitizeValue(req.body);
  next();
};

import authRoutes from "./routes/auth.routes.js";
import materialRoutes from "./routes/material.routes.js";
import cloudinaryRoutes from "./routes/cloudinary.routes.js";
import studySessionRoutes from "./routes/studySession.routes.js";
import { authRateLimiter } from "./middlewares/rateLimiter.middleware.js";
import { errorHandler } from "./middlewares/errorHandler.middleware.js";

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
  frameguard: false,
}));
app.use(mongoBodySanitize);

const allowedOrigins = process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : ["http://localhost:5173", "http://localhost:3000"];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Policy Violation: Origin not allowed"));
    }
  },
  credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api/auth", authRateLimiter, authRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);
app.use("/api/study-sessions", studySessionRoutes);

// Centralized Error Handler
app.use(errorHandler);

export default app;