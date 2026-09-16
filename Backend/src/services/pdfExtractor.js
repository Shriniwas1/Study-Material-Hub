import { PDFParse } from "pdf-parse";
import { logSecurityEvent, SECURITY_EVENTS } from "./securityLogger.js";

export const validatePdfMagicBytes = (buffer) => {
  if (!buffer || buffer.length < 5) return false;
  // %PDF- is 0x25 0x50 0x44 0x46 0x2D in ASCII
  const header = buffer.slice(0, 5).toString("ascii");
  return header === "%PDF-";
};

export const extractTextFromPdfBuffer = async (buffer) => {
  if (!validatePdfMagicBytes(buffer)) {
    throw new Error("Invalid PDF file format: Magic byte check failed (expected %PDF-).");
  }

  try {
    const parser = new PDFParse({ data: buffer });
    const parsedData = await parser.getText();

    const totalPages = parsedData.total || parsedData.pages?.length || 1;
    const fullText = parsedData.text || "";

    if (fullText.trim().length === 0) {
      throw new Error("EMPTY_PDF_TEXT: Document contains no extractable text (scanned or image-only PDF).");
    }

    const pages = [];
    if (parsedData.pages && parsedData.pages.length > 0) {
      parsedData.pages.forEach((p, idx) => {
        const cleaned = (p.text || "").replace(/\s+/g, " ").trim();
        if (cleaned.length > 0) {
          pages.push({ pageNumber: p.num || (idx + 1), text: cleaned });
        }
      });
    }

    if (pages.length === 0) {
      const charsPerPage = Math.ceil(fullText.length / totalPages);
      for (let i = 0; i < totalPages; i++) {
        const slice = fullText.substring(i * charsPerPage, (i + 1) * charsPerPage).replace(/\s+/g, " ").trim();
        if (slice.length > 0) {
          pages.push({ pageNumber: i + 1, text: slice });
        }
      }
    }

    return {
      totalPages,
      pages,
      rawText: fullText
    };
  } catch (error) {
    if (error.message.includes("EMPTY_PDF_TEXT")) throw error;
    throw new Error(`PDF Extraction Failed: ${error.message}`);
  }
};
