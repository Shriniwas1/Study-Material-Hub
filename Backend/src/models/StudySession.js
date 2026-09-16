// src/models/StudySession.js
import mongoose from "mongoose";

const studySessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    examDate: { type: Date },
    status: {
      type: String,
      enum: ["draft", "processing", "ready", "failed", "archived"],
      default: "draft"
    },
    documentCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

studySessionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("StudySession", studySessionSchema);
