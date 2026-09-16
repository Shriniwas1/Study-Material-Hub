// src/models/ChatSession.js
import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    studySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", required: true, index: true },
    title: { type: String, default: "Study Session Chat" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

chatSessionSchema.index({ userId: 1, studySessionId: 1, createdAt: -1 });

export default mongoose.model("ChatSession", chatSessionSchema);
