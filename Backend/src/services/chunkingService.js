// src/services/chunkingService.js
import crypto from "crypto";

export const createContentHash = (text) => {
  return crypto.createHash("sha256").update(text.trim()).digest("hex");
};

/**
 * Splits text into paragraphs/sections and creates compact, semantically coherent chunks.
 * Uses 250 words default (approx 325 tokens) with 40 words overlap.
 */
export const chunkDocumentPages = (pages, options = {}) => {
  const chunkSize = options.chunkSize || parseInt(process.env.CHUNK_SIZE || "250", 10);
  const chunkOverlap = options.chunkOverlap || parseInt(process.env.CHUNK_OVERLAP || "40", 10);

  const chunks = [];
  let globalChunkIndex = 0;

  for (const pageObj of pages) {
    const { pageNumber, text } = pageObj;
    if (!text || text.trim().length === 0) continue;

    // Split page text into natural paragraphs or sections
    const rawParagraphs = text
      .split(/\n\s*\n/)
      .map(p => p.replace(/\s+/g, " ").trim())
      .filter(p => p.length > 0);

    const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [text.replace(/\s+/g, " ").trim()];

    let currentChunkWords = [];

    const flushChunk = () => {
      if (currentChunkWords.length === 0) return;
      const chunkText = currentChunkWords.join(" ").trim();
      if (chunkText.length > 20) {
        const contentHash = createContentHash(chunkText);
        const tokenCount = Math.ceil(currentChunkWords.length * 1.3);

        chunks.push({
          chunkIndex: globalChunkIndex,
          pageNumber,
          chunkText,
          contentHash,
          tokenCount
        });
        globalChunkIndex++;
      }
    };

    for (const para of paragraphs) {
      const paraWords = para.split(" ").filter(w => w.length > 0);
      if (paraWords.length === 0) continue;

      // If a single paragraph is larger than chunkSize, break it with sliding window
      if (paraWords.length > chunkSize) {
        // Flush what we had so far
        flushChunk();
        currentChunkWords = [];

        let start = 0;
        while (start < paraWords.length) {
          const end = Math.min(start + chunkSize, paraWords.length);
          const slice = paraWords.slice(start, end);
          currentChunkWords = slice;
          flushChunk();
          currentChunkWords = [];
          if (end >= paraWords.length) break;
          start += (chunkSize - chunkOverlap);
        }
      } else if (currentChunkWords.length + paraWords.length <= chunkSize) {
        // Fits into current chunk
        currentChunkWords.push(...paraWords);
      } else {
        // Current chunk is full; save it and carry over overlap
        const overlapWords = currentChunkWords.slice(Math.max(0, currentChunkWords.length - chunkOverlap));
        flushChunk();
        currentChunkWords = [...overlapWords, ...paraWords];
      }
    }

    // Flush any remaining accumulated words for this page
    flushChunk();
  }

  return chunks;
};

