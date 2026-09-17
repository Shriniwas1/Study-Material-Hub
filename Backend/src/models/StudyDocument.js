// src/models/StudyDocument.js
import mongoose from "mongoose";

const studyDocumentSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    studySessionId: { type: mongoose.Schema.Types.ObjectId, ref: "StudySession", required: true, index: true },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    mimeType: { type: String, required: true },
    pdfUrl: { type: String, required: true },
    cloudinaryPublicId: { type: String },
    pageCount: { type: Number, default: 0 },
    chunkCount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["UPLOADED", "PROCESSING", "READY", "FAILED"],
      default: "UPLOADED"
    },
    errorMessage: { type: String, default: null },
    contentHash: { type: String, index: true },
    processingVersion: { type: String, default: "v2" },
    embeddingModel: { type: String, default: "text-embedding-004" },
    chunkSize: { type: Number, default: 250 },
    chunkOverlap: { type: Number, default: 40 },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

studyDocumentSchema.index({ userId: 1, studySessionId: 1 });
studyDocumentSchema.index({ studySessionId: 1, contentHash: 1 });

export default mongoose.model("StudyDocument", studyDocumentSchema);
