// src/services/resourceQuotaService.js
import StudySession from "../models/StudySession.js";
import StudyDocument from "../models/StudyDocument.js";
import ChatMessage from "../models/ChatMessage.js";
import QuizAttempt from "../models/QuizAttempt.js";

export const QUOTA_CONFIG = {
  MAX_STUDY_SESSIONS: parseInt(process.env.MAX_STUDY_SESSIONS || "20", 10),
  MAX_SESSION_DOCUMENTS: parseInt(process.env.MAX_SESSION_DOCUMENTS || "10", 10),
  MAX_PDF_SIZE_MB: parseInt(process.env.MAX_PDF_SIZE_MB || "15", 10),
  MAX_PAGES_PER_DOC: parseInt(process.env.MAX_PAGES_PER_DOC || "150", 10),
  MAX_DAILY_AI_QUESTIONS: parseInt(process.env.MAX_DAILY_AI_QUESTIONS || "100", 10),
  MAX_DAILY_QUIZZES: parseInt(process.env.MAX_DAILY_QUIZZES || "20", 10),
  MAX_TOKEN_CONTEXT: parseInt(process.env.MAX_TOKEN_CONTEXT || "4000", 10),
  MAX_TOP_K: parseInt(process.env.MAX_TOP_K || "5", 10),
  MAX_QUIZ_QUESTIONS: parseInt(process.env.MAX_QUIZ_QUESTIONS || "10", 10)
};

export const checkUserSessionQuota = async (userId) => {
  const count = await StudySession.countDocuments({ userId, status: { $ne: "archived" } });
  if (count >= QUOTA_CONFIG.MAX_STUDY_SESSIONS) {
    throw new Error(`Quota Exceeded: Maximum limit of ${QUOTA_CONFIG.MAX_STUDY_SESSIONS} active study sessions reached.`);
  }
};

export const checkDocumentQuota = async (userId, studySessionId) => {
  const count = await StudyDocument.countDocuments({ studySessionId });
  if (count >= QUOTA_CONFIG.MAX_SESSION_DOCUMENTS) {
    throw new Error(`Quota Exceeded: Maximum limit of ${QUOTA_CONFIG.MAX_SESSION_DOCUMENTS} documents per study session reached.`);
  }
};

export const checkDailyQuestionQuota = async (userId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await ChatMessage.countDocuments({
    userId,
    role: "user",
    createdAt: { $gte: startOfDay }
  });

  if (count >= QUOTA_CONFIG.MAX_DAILY_AI_QUESTIONS) {
    throw new Error(`Quota Exceeded: You have reached your daily limit of ${QUOTA_CONFIG.MAX_DAILY_AI_QUESTIONS} questions.`);
  }
};

export const checkDailyQuizQuota = async (userId) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const count = await QuizAttempt.countDocuments({
    userId,
    createdAt: { $gte: startOfDay }
  });

  if (count >= QUOTA_CONFIG.MAX_DAILY_QUIZZES) {
    throw new Error(`Quota Exceeded: You have reached your daily limit of ${QUOTA_CONFIG.MAX_DAILY_QUIZZES} quizzes.`);
  }
};
