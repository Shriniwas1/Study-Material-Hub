// src/services/retrievalService.js
import { generateEmbedding } from "./embeddingService.js";
import { searchVectorStore } from "./vectorStoreService.js";
import { getCache, setCache } from "../config/redis.js";
import crypto from "crypto";

const MIN_RELEVANCE_SCORE = parseFloat(process.env.MIN_RELEVANCE_SCORE || "0.32");

export const retrieveSessionContext = async ({ userId, studySessionId, queryText, topK = 5 }) => {
  // Check Redis cache for retrieval results
  const queryHash = crypto.createHash("sha256").update(`${studySessionId}:${queryText.trim().toLowerCase()}:${topK}`).digest("hex");
  const cacheKey = `retrieval:cache:${studySessionId}:${queryHash}`;

  const cached = await getCache(cacheKey);
  if (cached) {
    return cached;
  }

  const queryEmbedding = await generateEmbedding(queryText);

  const rawResults = await searchVectorStore({
    userId,
    studySessionId,
    queryEmbedding,
    queryText,
    topK
  });

  // Filter chunks below minimum similarity threshold to avoid hallucinations
  const filteredResults = rawResults.filter(chunk => chunk.score >= MIN_RELEVANCE_SCORE);

  // If no chunks meet the relevance threshold, return empty set so the system can
  // accurately state that no matching topic was found in the document.
  const result = {
    chunks: filteredResults,
    hasRelevantContext: filteredResults.length > 0,
    topScore: rawResults.length > 0 ? rawResults[0].score : 0
  };

  // Cache for 30 minutes
  await setCache(cacheKey, result, 1800);

  return result;
};
