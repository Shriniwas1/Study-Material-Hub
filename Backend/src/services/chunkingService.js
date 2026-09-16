// src/services/chunkingService.js
import crypto from "crypto";

export const createContentHash = (text) => {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
};

export const chunkDocumentPages = (pages, options = {}) => {
  const chunkSize = options.chunkSize || parseInt(process.env.CHUNK_SIZE || "800", 10);
  const chunkOverlap = options.chunkOverlap || parseInt(process.env.CHUNK_OVERLAP || "100", 10);

  const chunks = [];
  let globalChunkIndex = 0;

  for (const pageObj of pages) {
    const { pageNumber, text } = pageObj;
    if (!text || text.trim().length === 0) continue;

    const words = text.split(" ");
    let start = 0;

    while (start < words.length) {
      const end = Math.min(start + chunkSize, words.length);
      const chunkWords = words.slice(start, end);
      const chunkText = chunkWords.join(" ").trim();

      if (chunkText.length > 20) { // Filter out micro noise
        const contentHash = createContentHash(chunkText);
        const tokenCount = Math.ceil(chunkWords.length * 1.3); // Approximation

        chunks.push({
          chunkIndex: globalChunkIndex,
          pageNumber,
          chunkText,
          contentHash,
          tokenCount
        });

        globalChunkIndex++;
      }

      if (end >= words.length) break;
      start += (chunkSize - chunkOverlap);
    }
  }

  return chunks;
};
