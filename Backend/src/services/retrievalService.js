// src/services/retrievalService.js
import { generateEmbedding } from "./embeddingService.js";
import { searchVectorStore } from "./vectorStoreService.js";

const MIN_RELEVANCE_SCORE = parseFloat(process.env.MIN_RELEVANCE_SCORE || "0.25");

export const retrieveSessionContext = async ({ userId, studySessionId, queryText, topK = 5 }) => {
  const queryEmbedding = await generateEmbedding(queryText);

  const rawResults = await searchVectorStore({
    userId,
    studySessionId,
    queryEmbedding,
    topK
  });

  // Filter chunks below minimum similarity threshold to reduce hallucinations
  let filteredResults = rawResults.filter(chunk => chunk.score >= MIN_RELEVANCE_SCORE);

  // Fallback to top retrieved session chunks if score threshold returned empty set
  if (filteredResults.length === 0 && rawResults.length > 0) {
    filteredResults = rawResults.slice(0, Math.min(topK, 3));
  }

  return {
    chunks: filteredResults,
    hasRelevantContext: filteredResults.length > 0,
    topScore: rawResults.length > 0 ? rawResults[0].score : 0
  };
};
