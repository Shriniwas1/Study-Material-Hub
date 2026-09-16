// src/middlewares/errorHandler.middleware.js
import { logSecurityEvent } from "../services/securityLogger.js";

export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  console.error(`[ERROR] [${req.method}] ${req.originalUrl} - ${err.message}`);
  if (process.env.NODE_ENV !== "production") {
    console.error(err.stack);
  }

  // Handle Multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      error: { code: "FILE_TOO_LARGE", message: "File size exceeds maximum allowed limit." }
    });
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || "SERVER_ERROR",
      message: err.message || "An unexpected error occurred."
    }
  });
};
