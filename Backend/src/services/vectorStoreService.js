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

export const searchVectorStore = async ({ userId, studySessionId, queryEmbedding, topK = 5 }) => {
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
    if (isProduction) {
      console.error("❌ CRITICAL: MongoDB Atlas Vector Search failed in Production mode:", err.message);
      throw new Error("VECTOR_SEARCH_UNAVAILABLE: Production vector search engine is required but unavailable.");
    }
    console.warn(`[VECTOR SEARCH NOTICE] Atlas Vector Search index unavailable (${err.message}). Using local session vector calculation.`);
  }

  // FAIL-CLOSED CHECK FOR PRODUCTION MODE
  if (isProduction) {
    throw new Error("VECTOR_SEARCH_UNAVAILABLE: Production vector search engine is unavailable. Failed closed for security and performance.");
  }

  // DEVELOPMENT FALLBACK ONLY: Search only chunks belonging to this authorized userId & studySessionId
  const sessionChunks = await DocumentChunk.find({ userId, studySessionId }).lean();
  if (!sessionChunks || sessionChunks.length === 0) {
    return [];
  }

  const scored = sessionChunks.map(chunk => {
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    return {
      chunkId: chunk._id.toString(),
      documentId: chunk.documentId.toString(),
      fileName: chunk.fileName,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      chunkText: chunk.chunkText,
      score
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
};
