// src/services/quizService.js
import { GoogleGenAI } from "@google/genai";
import { retrieveSessionContext } from "./retrievalService.js";
import { QUOTA_CONFIG } from "./resourceQuotaService.js";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

const llmModel = process.env.LLM_MODEL || "gemini-1.5-flash";
let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export const generateSessionQuiz = async ({ userId, studySessionId, questionCount = 5 }) => {
  const clampedCount = Math.min(questionCount, QUOTA_CONFIG.MAX_QUIZ_QUESTIONS);

  // Retrieve general context from session chunks
  const { chunks, hasRelevantContext } = await retrieveSessionContext({
    userId,
    studySessionId,
    queryText: "important concepts definitions main topics overview key facts",
    topK: 8
  });

  if (!hasRelevantContext || chunks.length === 0) {
    throw new Error("NO_CONTEXT: Cannot generate a quiz because no study materials have been uploaded or processed for this session.");
  }

  const contextText = chunks.map(c => c.chunkText).join("\n\n");

  const prompt = `
You are an educational quiz generator. Generate exactly ${clampedCount} multiple-choice questions (MCQs) strictly based on the provided document context below.

DOCUMENT CONTEXT:
${contextText}

JSON RESPONSE FORMAT REQUIREMENT:
Return ONLY a raw JSON array of objects with NO markdown code blocks or extra text:
[
  {
    "id": "q1",
    "question": "What is ...?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 0,
    "explanation": "Explanation based on the text..."
  }
]
`;

  let quizQuestions = [];

  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const response = await aiClient.models.generateContent({
        model: llmModel,
        contents: [{ role: "user", parts: [{ text: prompt }] }]
      });

      const text = (response.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);

      if (Array.isArray(parsed) && parsed.length > 0) {
        quizQuestions = parsed.map((q, idx) => ({
          id: `q_${idx + 1}_${crypto.randomBytes(4).toString("hex")}`,
          question: String(q.question),
          options: Array.isArray(q.options) ? q.options.slice(0, 4) : ["A", "B", "C", "D"],
          correctOptionIndex: typeof q.correctOptionIndex === "number" ? q.correctOptionIndex : 0,
          explanation: q.explanation || "Derived from course study material."
        }));
      }
    } catch (err) {
      console.warn(`[QUIZ SERVICE] LLM quiz generation failed: ${err.message}. Using structured chunk quiz generator fallback.`);
    }
  }

  // Robust fallback MCQ generator if LLM response unavailable
  if (quizQuestions.length === 0) {
    quizQuestions = chunks.slice(0, clampedCount).map((chunk, idx) => {
      const snippet = chunk.chunkText.substring(0, 120);
      return {
        id: `q_${idx + 1}_${crypto.randomBytes(4).toString("hex")}`,
        question: `According to ${chunk.fileName} (Page ${chunk.pageNumber}), which statement best reflects the key concept discussed?`,
        options: [
          snippet,
          `An alternative concept unrelated to ${chunk.fileName}.`,
          `Opposite principles regarding subject matter on Page ${chunk.pageNumber}.`,
          `None of the above options are accurate.`
        ],
        correctOptionIndex: 0,
        explanation: `Sourced directly from ${chunk.fileName} Page ${chunk.pageNumber}.`
      };
    });
  }

  return {
    title: "AI Test Prep Quiz",
    questionCount: quizQuestions.length,
    questions: quizQuestions
  };
};
