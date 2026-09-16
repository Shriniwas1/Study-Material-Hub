// src/models/QuizAttempt.js
import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctOptionIndex: { type: Number, required: true },
    explanation: { type: String }
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    studySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", required: true, index: true },
    title: { type: String, default: "Practice Quiz" },
    questions: [questionSchema],
    userAnswers: [{ type: Number }], // Indexes selected by user
    score: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

quizAttemptSchema.index({ userId: 1, studySessionId: 1, createdAt: -1 });

export default mongoose.model("QuizAttempt", quizAttemptSchema);
