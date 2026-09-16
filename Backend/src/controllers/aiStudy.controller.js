// src/controllers/aiStudy.controller.js
import StudySession from "../models/StudySession.js";
import ChatSession from "../models/ChatSession.js";
import ChatMessage from "../models/ChatMessage.js";
import QuizAttempt from "../models/QuizAttempt.js";
import { generateRAGResponse } from "../services/ragService.js";
import { generateSessionQuiz } from "../services/quizService.js";
import { checkDailyQuestionQuota, checkDailyQuizQuota } from "../services/resourceQuotaService.js";

const getUserId = (req) => req.user?._id?.toString() || req.user?.id?.toString() || req.user?.id;

// POST /api/study-sessions/:sessionId/chat
export const handleSessionChat = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    const { question, mode = "ASK", topK = 5 } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    await checkDailyQuestionQuota(userId);

    // Get or create ChatSession for this study session
    let chatSession = await ChatSession.findOne({ studySessionId: session._id, userId });
    if (!chatSession) {
      chatSession = await ChatSession.create({
        userId,
        studySessionId: session._id,
        title: `${session.title} Discussion`
      });
    }

    // Record user message
    await ChatMessage.create({
      chatSessionId: chatSession._id,
      studySessionId: session._id,
      userId,
      role: "user",
      content: question,
      mode
    });

    // Execute RAG Pipeline with prompt injection guard & relevance threshold
    const ragResult = await generateRAGResponse({
      userId,
      studySessionId: session._id,
      question,
      mode,
      topK
    });

    // Save assistant message with derived sources
    const assistantMsg = await ChatMessage.create({
      chatSessionId: chatSession._id,
      studySessionId: session._id,
      userId,
      role: "assistant",
      content: ragResult.answer,
      sources: ragResult.sources,
      mode,
      grounded: ragResult.grounded
    });

    res.json({
      messageId: assistantMsg._id,
      answer: ragResult.answer,
      sources: ragResult.sources,
      grounded: ragResult.grounded,
      mode
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /api/study-sessions/:sessionId/chats
export const getSessionChatHistory = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    const messages = await ChatMessage.find({ studySessionId: session._id, userId })
      .sort({ createdAt: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/study-sessions/:sessionId/quiz
export const handleGenerateQuiz = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;
    const { questionCount = 5 } = req.body;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    await checkDailyQuizQuota(userId);

    const quiz = await generateSessionQuiz({
      userId,
      studySessionId: session._id,
      questionCount
    });

    const attempt = await QuizAttempt.create({
      userId,
      studySessionId: session._id,
      title: `${session.subject} Practice Quiz`,
      questions: quiz.questions,
      score: 0,
      total: quiz.questions.length
    });

    res.json({
      quizId: attempt._id,
      title: attempt.title,
      questions: attempt.questions.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
      }))
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// POST /api/quizzes/:quizId/attempts
export const handleSubmitQuizAttempt = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { quizId } = req.params;
    const { userAnswers } = req.body; // Array of selected option indexes

    const attempt = await QuizAttempt.findOne({ _id: quizId, userId });
    if (!attempt) {
      return res.status(404).json({ error: "Quiz attempt not found or unauthorized access" });
    }

    let score = 0;
    const results = attempt.questions.map((q, idx) => {
      const selectedIndex = userAnswers[idx];
      const isCorrect = selectedIndex === q.correctOptionIndex;
      if (isCorrect) score++;

      return {
        questionId: q.id,
        question: q.question,
        selectedOptionIndex: selectedIndex,
        correctOptionIndex: q.correctOptionIndex,
        isCorrect,
        explanation: q.explanation
      };
    });

    attempt.userAnswers = userAnswers;
    attempt.score = score;
    await attempt.save();

    res.json({
      quizId: attempt._id,
      score,
      total: attempt.total,
      percentage: Math.round((score / attempt.total) * 100),
      results
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
