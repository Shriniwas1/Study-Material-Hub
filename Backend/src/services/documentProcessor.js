// src/services/documentProcessor.js
import axios from "axios";
import StudyDocument from "../models/StudyDocument.js";
import StudySession from "../models/StudySession.js";
import DocumentChunk from "../models/DocumentChunk.js";
import { extractTextFromPdfBuffer } from "./pdfExtractor.js";
import { chunkDocumentPages } from "./chunkingService.js";
import { generateEmbeddings } from "./embeddingService.js";
import { isUrlSafeForDownload } from "../middlewares/ssrfGuard.js";
import { logSecurityEvent, SECURITY_EVENTS } from "./securityLogger.js";
import { delCachePattern } from "../config/redis.js";

export const processDocumentAsync = async (documentId) => {
  try {
    const document = await StudyDocument.findById(documentId);
    if (!document) return;

    document.status = "PROCESSING";
    await document.save();

    // Update study session status to processing
    await StudySession.findByIdAndUpdate(document.studySessionId, { status: "processing" });

    // Download PDF safely
    let pdfBuffer = null;
    if (document.pdfUrl) {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey    = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;
      const publicId  = document.cloudinaryPublicId;

      let downloadUrl;
      const requestOptions = {
        responseType: "arraybuffer",
        timeout: 30000
      };

      if (publicId && cloudName && apiKey && apiSecret) {
        requestOptions.auth = { username: apiKey, password: apiSecret };
        try {
          downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(publicId)}&type=upload`;
          const response = await axios.get(downloadUrl, requestOptions);
          pdfBuffer = Buffer.from(response.data);
        } catch (rawErr) {
          downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/download?public_id=${encodeURIComponent(publicId)}&type=upload`;
          const response = await axios.get(downloadUrl, requestOptions);
          pdfBuffer = Buffer.from(response.data);
        }
      } else {
        downloadUrl = document.pdfUrl;
        if (!isUrlSafeForDownload(downloadUrl)) {
          logSecurityEvent(SECURITY_EVENTS.SSRF_ATTEMPT_BLOCKED, {
            userId: document.userId,
            reason: `Document processor blocked SSRF URL: ${downloadUrl}`
          });
          throw new Error("SECURITY_ERROR: Document URL points to an unauthorized or internal location.");
        }
        const response = await axios.get(downloadUrl, requestOptions);
        pdfBuffer = Buffer.from(response.data);
      }
    } else {
      throw new Error("MISSING_URL: Document does not contain a valid URL.");
    }

    // 1. Extract text page-by-page
    const { totalPages, pages } = await extractTextFromPdfBuffer(pdfBuffer);
    document.pageCount = totalPages;

    // 2. Chunk text
    const rawChunks = chunkDocumentPages(pages, {
      chunkSize: document.chunkSize,
      chunkOverlap: document.chunkOverlap
    });

    if (rawChunks.length === 0) {
      throw new Error("NO_CHUNKS: Document text produced no usable text chunks.");
    }

    // 3. Generate Embeddings
    const chunkTexts = rawChunks.map(c => c.chunkText);
    const contentHashes = rawChunks.map(c => c.contentHash);
    const embeddings = await generateEmbeddings(chunkTexts, contentHashes);

    // 4. Idempotent Vector Store Insertion
    // Remove old chunks for this document if reprocessing
    await DocumentChunk.deleteMany({ documentId: document._id });

    const chunkDocs = rawChunks.map((chunk, index) => ({
      userId: document.userId,
      studySessionId: document.studySessionId,
      documentId: document._id,
      fileName: document.originalName || document.fileName,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      embedding: embeddings[index],
      contentHash: chunk.contentHash,
      tokenCount: chunk.tokenCount,
      processingVersion: document.processingVersion
    }));

    await DocumentChunk.insertMany(chunkDocs);

    // 5. Update Status
    document.chunkCount = chunkDocs.length;
    document.status = "READY";
    document.errorMessage = null;
    await document.save();

    // Invalidate stale RAG and retrieval caches now that new chunks are ready
    delCachePattern(`rag:cache:${document.studySessionId}:*`);
    delCachePattern(`retrieval:cache:${document.studySessionId}:*`);

    // Update Session status & doc count
    const totalReadyDocs = await StudyDocument.countDocuments({
      studySessionId: document.studySessionId,
      status: "READY"
    });

    await StudySession.findByIdAndUpdate(document.studySessionId, {
      status: "ready",
      documentCount: totalReadyDocs
    });

    console.log(`✅ [DOCUMENT PROCESSOR] Document ${document._id} processed successfully. ${chunkDocs.length} chunks indexed.`);
  } catch (error) {
    console.error(`❌ [DOCUMENT PROCESSOR FAILED] Document ${documentId}:`, error.message);
    
    try {
      const doc = await StudyDocument.findById(documentId);
      if (doc) {
        doc.status = "FAILED";
        doc.errorMessage = error.message;
        await doc.save();

        await StudySession.findByIdAndUpdate(doc.studySessionId, { status: "failed" });
      }
    } catch (saveErr) {
      console.error("Failed to set document failure status:", saveErr.message);
    }
  }
};
