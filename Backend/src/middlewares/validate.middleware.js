// src/middlewares/validate.middleware.js
import { z } from "zod";
import { QUOTA_CONFIG } from "../services/resourceQuotaService.js";

export const validateRequest = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const details = error.issues.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return res.status(400).json({ error: `Validation Error: ${details}` });
    }
    next(error);
  }
};

// Zod Schemas
export const createSessionSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(100),
    subject: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    examDate: z.string().optional()
  })
});

export const chatQuerySchema = z.object({
  body: z.object({
    question: z.string().min(2).max(1000, "Question length must not exceed 1000 characters"),
    mode: z.enum(["ASK", "EXPLAIN", "SUMMARIZE", "TEST_ME"]).optional().default("ASK"),
    topK: z.number().int().positive().optional().transform(val => 
      val ? Math.min(val, QUOTA_CONFIG.MAX_TOP_K) : QUOTA_CONFIG.MAX_TOP_K
    )
  })
});

export const quizGenerateSchema = z.object({
  body: z.object({
    questionCount: z.number().int().positive().optional().transform(val => 
      val ? Math.min(val, QUOTA_CONFIG.MAX_QUIZ_QUESTIONS) : 5
    )
  })
});
