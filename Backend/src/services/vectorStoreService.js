// src/services/vectorStoreService.js
import DocumentChunk from "../models/DocumentChunk.js";

/**
 * Compute cosine similarity between two vector arrays
 */
export const cosineSimilarity = (vecA, vecB) => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

export const searchVectorStore = async ({ userId, studySessionId, queryEmbedding, queryText = "", topK = 5 }) => {
  const isProduction = process.env.NODE_ENV === "production";
  const vectorIndexName = process.env.VECTOR_INDEX_NAME || "vector_index";

  try {
    // Attempt MongoDB Atlas Vector Search pipeline first
    const pipeline = [
      {
        $vectorSearch: {
          index: vectorIndexName,
          path: "embedding",
          queryVector: queryEmbedding,
          numCandidates: topK * 10,
          limit: topK,
          filter: {
            userId: userId,
            studySessionId: studySessionId
          }
        }
      },
      {
        $project: {
          _id: 1,
          documentId: 1,
          fileName: 1,
          pageNumber: 1,
          chunkIndex: 1,
          chunkText: 1,
          score: { $meta: "vectorSearchScore" }
        }
      }
    ];

    const atlasResults = await DocumentChunk.aggregate(pipeline);
    if (atlasResults && atlasResults.length > 0) {
      return atlasResults.map(r => ({
        chunkId: r._id.toString(),
        documentId: r.documentId.toString(),
        fileName: r.fileName,
        pageNumber: r.pageNumber,
        chunkIndex: r.chunkIndex,
        chunkText: r.chunkText,
        score: r.score
      }));
    }
  } catch (err) {
    console.warn(`[VECTOR SEARCH NOTICE] Atlas Vector Search pipeline notice (${err.message}). Falling back to session vector calculation.`);
  }

  // Session-scoped vector search fallback (enforces strict userId & studySessionId isolation)
  const sessionChunks = await DocumentChunk.find({ userId, studySessionId }).lean();
  if (!sessionChunks || sessionChunks.length === 0) {
    return [];
  }

  const queryClean = queryText.toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const stopWords = new Set([
    "what", "when", "where", "which", "with", "from", "that", "this", "about",
    "explain", "tell", "describe", "give", "show", "does", "have", "been", "were",
    "the", "and", "for", "are", "can", "you", "made", "make", "project", "work",
    "experience", "worked", "overview", "detail", "details", "information", "info",
    "question", "topic", "mention", "mentioned"
  ]);

  // Meaningful keywords (length >= 3 and not generic stop words)
  const allWords = queryClean.split(/\s+/).filter(w => w.length >= 2);
  const keywords = allWords.filter(w => !stopWords.has(w) && w.length >= 3);
  const searchTerms = keywords.length > 0 ? keywords : allWords;

  const scored = sessionChunks.map(chunk => {
    const textLower = (chunk.chunkText || "").toLowerCase();
    const cosSim = Math.max(0, cosineSimilarity(queryEmbedding, chunk.embedding));

    // Keyword coverage: fraction of unique search terms found in chunk
    let matchedTerms = 0;
    let termFrequency = 0;

    for (const term of searchTerms) {
      if (textLower.includes(term)) {
        matchedTerms++;
        // Count occurrences
        const regex = new RegExp(`\\b${term}`, "g");
        const matches = textLower.match(regex);
        if (matches) {
          termFrequency += matches.length;
        }
      }
    }

    const keywordCoverage = searchTerms.length > 0 ? (matchedTerms / searchTerms.length) : 0;
    const tfScore = Math.min(1, termFrequency / (searchTerms.length * 2 || 1));

    // Exact phrase match bonus if query is 2+ words and found verbatim in chunk
    let phraseBonus = 0;
    if (searchTerms.length >= 2) {
      const phrase = searchTerms.join(" ");
      if (textLower.includes(phrase)) {
        phraseBonus = 0.25;
      }
    }

    // Hybrid calculation:
    // If search terms are absent or coverage is under 50% without high semantic similarity, keep score low
    let finalScore = 0;
    if (searchTerms.length > 0 && keywordCoverage === 0) {
      finalScore = cosSim * 0.2;
    } else if (searchTerms.length > 1 && keywordCoverage < 0.5 && cosSim < 0.35) {
      finalScore = Math.min(0.25, (cosSim * 0.3) + (keywordCoverage * 0.2));
    } else {
      finalScore = (cosSim * 0.4) + (keywordCoverage * 0.4) + (tfScore * 0.2) + phraseBonus;
    }

    return {
      chunkId: chunk._id.toString(),
      documentId: chunk.documentId.toString(),
      fileName: chunk.fileName,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      score: Math.min(1.0, finalScore)
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};
