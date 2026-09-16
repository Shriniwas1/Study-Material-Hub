// src/models/DocumentChunk.js
import mongoose from "mongoose";

const documentChunkSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    studySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", required: true, index: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "StudyDocument", required: true, index: true },
    fileName: { type: String, required: true },
    pageNumber: { type: Number, required: true },
    chunkIndex: { type: Number, required: true },
    chunkText: { type: String, required: true },
    embedding: { type: [Number], required: true },
    contentHash: { type: String, index: true },
    tokenCount: { type: Number, default: 0 },
    processingVersion: { type: String, default: "v1" },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

documentChunkSchema.index({ userId: 1, studySessionId: 1, documentId: 1 });
documentChunkSchema.index({ studySessionId: 1, documentId: 1, chunkIndex: 1 }, { unique: true });

export default mongoose.model("DocumentChunk", documentChunkSchema);
