// src/middlewares/ssrfGuard.js
import { URL } from "url";
import { logSecurityEvent, SECURITY_EVENTS } from "../services/securityLogger.js";

const BLOCKED_HOSTS = [
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "169.254.169.254", // AWS/Cloud Metadata Service
  "metadata.google.internal"
];

const ALLOWED_CDN_DOMAINS = [
  "res.cloudinary.com",
  "api.cloudinary.com"
];

export const isUrlSafeForDownload = (targetUrl) => {
  try {
    const parsed = new URL(targetUrl);
    
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check blocked hosts & internal IP ranges
    if (BLOCKED_HOSTS.includes(hostname)) {
      return false;
    }

    if (
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.16.") ||
      hostname.startsWith("172.31.")
    ) {
      return false;
    }

    // Must belong to allowed CDN domains if configured
    const isAllowedDomain = ALLOWED_CDN_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith("." + domain)
    );

    return isAllowedDomain;
  } catch (err) {
    return false;
  }
};

export const ssrfUrlValidator = (req, res, next) => {
  const targetUrl = req.body.pdfUrl || req.body.url;
  if (targetUrl && !isUrlSafeForDownload(targetUrl)) {
    logSecurityEvent(SECURITY_EVENTS.SSRF_ATTEMPT_BLOCKED, {
      userId: req.user?._id || req.user?.id,
      ip: req.ip,
      path: req.originalUrl,
      reason: `Blocked SSRF target URL: ${targetUrl}`
    });
    return res.status(400).json({ error: "Invalid or unauthorized resource URL" });
  }
  next();
};
