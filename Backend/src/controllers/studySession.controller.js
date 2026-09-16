// src/controllers/studySession.controller.js
import StudySession from "../models/StudySession.js";
import StudyDocument from "../models/StudyDocument.js";
import DocumentChunk from "../models/DocumentChunk.js";
import cloudinary from "../config/cloudinary.js";
import { processDocumentAsync } from "../services/documentProcessor.js";
import { validatePdfMagicBytes } from "../services/pdfExtractor.js";
import { checkUserSessionQuota, checkDocumentQuota, QUOTA_CONFIG } from "../services/resourceQuotaService.js";
import { logSecurityEvent, SECURITY_EVENTS } from "../services/securityLogger.js";

const getUserId = (req) => req.user?._id?.toString() || req.user?.id?.toString() || req.user?.id;

// POST /api/study-sessions
export const createSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    await checkUserSessionQuota(userId);

    const { title, subject, description, examDate } = req.body;

    const session = await StudySession.create({
      userId,
      title,
      subject,
      description: description || "",
      examDate: examDate ? new Date(examDate) : null,
      status: "draft"
    });

    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /api/study-sessions
export const getSessions = async (req, res) => {
  try {
    const userId = getUserId(req);
    const sessions = await StudySession.find({ userId, status: { $ne: "archived" } }).sort({ createdAt: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/study-sessions/:sessionId
export const getSessionById = async (req, res) => {
  try {
    const userId = getUserId(req);
    const session = await StudySession.findOne({ _id: req.params.sessionId, userId });

    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// PATCH /api/study-sessions/:sessionId
export const updateSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    const session = await StudySession.findOneAndUpdate(
      { _id: req.params.sessionId, userId },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    res.json(session);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// DELETE /api/study-sessions/:sessionId
export const deleteSession = async (req, res) => {
  try {
    const userId = getUserId(req);
    const session = await StudySession.findOne({ _id: req.params.sessionId, userId });

    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    // Clean up all documents and vector chunks for this session
    await DocumentChunk.deleteMany({ studySessionId: session._id, userId });
    await StudyDocument.deleteMany({ studySessionId: session._id, userId });
    await StudySession.findByIdAndDelete(session._id);

    res.json({ message: "Study session and associated vector documents deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/study-sessions/:sessionId/documents
export const uploadSessionDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    await checkDocumentQuota(userId, sessionId);

    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    // PDF Magic Bytes Validation
    if (!validatePdfMagicBytes(req.file.buffer)) {
      logSecurityEvent(SECURITY_EVENTS.INVALID_FILE, {
        userId,
        ip: req.ip,
        reason: "Uploaded file magic byte validation failed (Not a valid PDF)."
      });
      return res.status(400).json({ error: "Invalid file type: File is not a valid PDF document." });
    }

    // Upload to Cloudinary using stream / buffer upload
    const uploadToCloudinary = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "study-session-pdfs",
            resource_type: "raw",   // Force raw resource type for PDFs to enable Admin API download
            access_mode: "public",
            type: "upload"
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const cloudRes = await uploadToCloudinary();

    // Create StudyDocument entry in PROCESSING state
    const document = await StudyDocument.create({
      userId,
      studySessionId: session._id,
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      pdfUrl: cloudRes.secure_url,
      cloudinaryPublicId: cloudRes.public_id,
      status: "PROCESSING"
    });

    // Launch background asynchronous document processing pipeline
    setImmediate(() => {
      processDocumentAsync(document._id);
    });

    // Return 202 Accepted immediately
    res.status(202).json({
      message: "PDF uploaded successfully. Processing started.",
      documentId: document._id,
      status: "PROCESSING"
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET /api/study-sessions/:sessionId/status
export const getSessionStatus = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId } = req.params;

    const session = await StudySession.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ error: "Study session not found or unauthorized access" });
    }

    const documents = await StudyDocument.find({ studySessionId: sessionId, userId }).sort({ createdAt: -1 });

    // Auto-recovery: Auto-retry any failed documents in background
    const failedDocsList = documents.filter(d => d.status === "FAILED");
    for (const doc of failedDocsList) {
      doc.status = "PROCESSING";
      doc.errorMessage = null;
      await doc.save();
      setImmediate(() => {
        processDocumentAsync(doc._id);
      });
    }

    const totalDocs = documents.length;
    const readyDocs = documents.filter(d => d.status === "READY").length;
    const processingDocs = documents.filter(d => d.status === "PROCESSING" || d.status === "UPLOADED").length + failedDocsList.length;
    const failedDocs = 0;

    res.json({
      sessionId: session._id,
      sessionStatus: session.status === "failed" && failedDocsList.length > 0 ? "processing" : session.status,
      summary: {
        totalDocs,
        readyDocs,
        processingDocs,
        failedDocs
      },
      documents: documents.map(d => ({
        id: d._id,
        fileName: d.originalName || d.fileName,
        fileSize: d.fileSize,
        pageCount: d.pageCount,
        chunkCount: d.chunkCount,
        status: failedDocsList.some(fd => fd._id.toString() === d._id.toString()) ? "PROCESSING" : d.status,
        pdfUrl: d.pdfUrl,
        errorMessage: d.errorMessage,
        createdAt: d.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /api/study-sessions/:sessionId/documents/:documentId/retry
export const retryDocumentProcessing = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId, documentId } = req.params;

    const document = await StudyDocument.findOne({ _id: documentId, studySessionId: sessionId, userId });
    if (!document) {
      return res.status(404).json({ error: "Document not found or unauthorized access" });
    }

    document.status = "PROCESSING";
    document.errorMessage = null;
    await document.save();

    setImmediate(() => {
      processDocumentAsync(document._id);
    });

    res.json({ message: "Reprocessing started for document", documentId: document._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE /api/study-sessions/:sessionId/documents/:documentId
export const deleteDocument = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { sessionId, documentId } = req.params;

    const document = await StudyDocument.findOne({ _id: documentId, studySessionId: sessionId, userId });
    if (!document) {
      return res.status(404).json({ error: "Document not found or unauthorized access" });
    }

    await DocumentChunk.deleteMany({ documentId: document._id, userId });
    await StudyDocument.findByIdAndDelete(document._id);

    // Recalculate session status & count
    const remainingCount = await StudyDocument.countDocuments({ studySessionId: sessionId, status: "READY" });
    await StudySession.findByIdAndUpdate(sessionId, { documentCount: remainingCount });

    res.json({ message: "Document and vector index chunks removed successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
