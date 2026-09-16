// src/routes/studySession.routes.js
import express from "express";
import multer from "multer";
import { protect } from "../middlewares/auth.middleware.js";
import {
  authRateLimiter,
  apiRateLimiter,
  uploadRateLimiter,
  chatRateLimiter
} from "../middlewares/rateLimiter.middleware.js";
import {
  validateRequest,
  createSessionSchema,
  chatQuerySchema,
  quizGenerateSchema
} from "../middlewares/validate.middleware.js";
import { ssrfUrlValidator } from "../middlewares/ssrfGuard.js";
import {
  createSession,
  getSessions,
  getSessionById,
  updateSession,
  deleteSession,
  uploadSessionDocument,
  getSessionStatus,
  retryDocumentProcessing,
  deleteDocument
} from "../controllers/studySession.controller.js";
import {
  handleSessionChat,
  getSessionChatHistory,
  handleGenerateQuiz,
  handleSubmitQuizAttempt
} from "../controllers/aiStudy.controller.js";

const router = express.Router();

// Safe Multer memory storage configuration with 15MB limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_PDF_SIZE_MB || "15", 10) * 1024 * 1024,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF documents are allowed."), false);
    }
  }
});

// All study session routes require Authentication
router.use(protect);

// Study Session CRUD Routes
router.post("/", apiRateLimiter, validateRequest(createSessionSchema), createSession);
router.get("/", apiRateLimiter, getSessions);
router.get("/:sessionId", apiRateLimiter, getSessionById);
router.patch("/:sessionId", apiRateLimiter, updateSession);
router.delete("/:sessionId", apiRateLimiter, deleteSession);

// Document Management & Async Ingestion
router.post(
  "/:sessionId/documents",
  uploadRateLimiter,
  upload.single("file"),
  ssrfUrlValidator,
  uploadSessionDocument
);
router.get("/:sessionId/status", apiRateLimiter, getSessionStatus);
router.post("/:sessionId/documents/:documentId/retry", apiRateLimiter, retryDocumentProcessing);
router.delete("/:sessionId/documents/:documentId", apiRateLimiter, deleteDocument);

// AI Study Room Chat & Quiz Routes
router.post("/:sessionId/chat", chatRateLimiter, validateRequest(chatQuerySchema), handleSessionChat);
router.get("/:sessionId/chats", apiRateLimiter, getSessionChatHistory);
router.post("/:sessionId/quiz", chatRateLimiter, validateRequest(quizGenerateSchema), handleGenerateQuiz);
router.post("/quizzes/:quizId/attempts", apiRateLimiter, handleSubmitQuizAttempt);

export default router;
