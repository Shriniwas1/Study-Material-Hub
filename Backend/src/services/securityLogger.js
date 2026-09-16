// src/services/securityLogger.js
import fs from "fs";
import path from "path";

export const SECURITY_EVENTS = {
  LOGIN_FAILED: "LOGIN_FAILED",
  UNAUTHORIZED_ACCESS: "UNAUTHORIZED_ACCESS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  UPLOAD_REJECTED: "UPLOAD_REJECTED",
  INVALID_FILE: "INVALID_FILE",
  PROMPT_INJECTION_DETECTED: "PROMPT_INJECTION_DETECTED",
  AI_QUOTA_EXCEEDED: "AI_QUOTA_EXCEEDED",
  SSRF_ATTEMPT_BLOCKED: "SSRF_ATTEMPT_BLOCKED",
  DOCUMENT_PROCESSING_FAILED: "DOCUMENT_PROCESSING_FAILED"
};

export const logSecurityEvent = (eventType, details = {}) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    userId: details.userId || "ANONYMOUS",
    ip: details.ip || "UNKNOWN",
    path: details.path || "N/A",
    reason: details.reason || "N/A",
    metadata: details.metadata || {}
  };

  console.warn(`[SECURITY EVENT] [${logEntry.timestamp}] [${logEntry.event}] User: ${logEntry.userId} | IP: ${logEntry.ip} | Path: ${logEntry.path} | Reason: ${logEntry.reason}`);
  return logEntry;
};
