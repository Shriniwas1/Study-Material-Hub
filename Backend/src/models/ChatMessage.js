// src/models/ChatMessage.js
import mongoose from "mongoose";

const citationSourceSchema = new mongoose.Schema(
  {
    documentId: { type: String, required: true },
    fileName: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    chunkId: { type: String }
  },
  { _id: false }
);

const chatMessageSchema = new mongoose.Schema(
  {
    chatSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession", required: true, index: true },
    studySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["user", "assistant", "system"], required: true },
    content: { type: String, required: true },
    sources: [citationSourceSchema],
    mode: { type: String, enum: ["ASK", "EXPLAIN", "SUMMARIZE", "TEST_ME"], default: "ASK" },
    grounded: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

chatMessageSchema.index({ chatSessionId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", chatMessageSchema);
