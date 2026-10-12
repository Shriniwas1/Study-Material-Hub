// src/services/embeddingService.js
import { GoogleGenAI } from "@google/genai";
import { getCache, setCache } from "../config/redis.js";
import dotenv from "dotenv";
dotenv.config();

const provider = process.env.EMBEDDING_PROVIDER || "gemini";
const embeddingModel = process.env.EMBEDDING_MODEL || "gemini-embedding-001";

// Optional pinned output dimensionality. gemini-embedding-001 defaults to 3072
// but supports 768/1536/3072; set EMBEDDING_DIMENSIONS to pin it so stored
// vectors match the Atlas index and the fallback dimension. When unset we send
// no config and accept the model's native dimension.
const embeddingDimensions = process.env.EMBEDDING_DIMENSIONS
  ? parseInt(process.env.EMBEDDING_DIMENSIONS, 10)
  : null;
const fallbackDimensions = embeddingDimensions || 768;

// Marker recorded on vectors that were NOT produced by the real embedding model.
export const FALLBACK_EMBEDDING_MODEL = "deterministic-fallback-v1";

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Fallback is only permitted when no real embedding provider is configured
// (local/dev without a key), or when explicitly opted-in for tests.
// When a GEMINI_API_KEY IS present we expect genuine embeddings and treat the
// absence of one as a hard failure instead of silently storing noise vectors.
const fallbackAllowed =
  !process.env.GEMINI_API_KEY || process.env.EMBEDDING_ALLOW_FALLBACK === "true";

if (fallbackAllowed && !process.env.GEMINI_API_KEY) {
  console.warn(
    "⚠️ [EMBEDDING] No GEMINI_API_KEY configured. Using DETERMINISTIC, NON-SEMANTIC fallback embeddings. " +
    "Vector similarity will be meaningless — set GEMINI_API_KEY for real embeddings."
  );
}

// In-memory L1 cache (genuine embeddings only)
const embeddingCache = new Map();

/**
 * Generate a deterministic synthetic vector fallback.
 * NOTE: This is NOT a semantic embedding — it is a reproducible hash of the
 * characters in the text, used only so local/dev environments can run the
 * pipeline without an API key. It must never be mistaken for a real embedding.
 */
const generateFallbackEmbedding = (text) => {
  const dims = fallbackDimensions;
  const vector = new Array(dims).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * (i + 1)) % dims;
    vector[index] = (vector[index] + (charCode / 255)) % 1;
  }
  // Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / norm);
};

/**
 * Validate that an SDK response produced a usable numeric vector.
 * @google/genai v2.x returns { embeddings: [{ values: number[] }] } (plural).
 */
export const extractEmbeddingValues = (response) => {
  const values = response?.embeddings?.[0]?.values;
  if (
    Array.isArray(values) &&
    values.length > 0 &&
    values.every(v => typeof v === "number" && Number.isFinite(v))
  ) {
    return values;
  }
  return null;
};

/**
 * Returns { embedding: number[], isFallback: boolean }.
 * Throws when a genuine embedding is required (API key present) but cannot be obtained.
 */
export const generateEmbedding = async (text, contentHash = null) => {
  // L1 In-memory cache check (genuine embeddings only are ever cached)
  if (contentHash && embeddingCache.has(contentHash)) {
    return { embedding: embeddingCache.get(contentHash), isFallback: false };
  }

  // L2 Redis cache check
  if (contentHash) {
    const redisCached = await getCache(`emb:cache:${contentHash}`);
    if (redisCached) {
      embeddingCache.set(contentHash, redisCached);
      return { embedding: redisCached, isFallback: false };
    }
  }

  let embedding = null;
  let apiErrorMessage = null;

  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const request = { model: embeddingModel, contents: text };
      if (embeddingDimensions) {
        request.config = { outputDimensionality: embeddingDimensions };
      }
      const response = await aiClient.models.embedContent(request);
      embedding = extractEmbeddingValues(response);
      if (!embedding) {
        apiErrorMessage =
          "Gemini embedContent returned no usable 'embeddings[0].values' array (unexpected response shape).";
      }
    } catch (error) {
      apiErrorMessage = error.message;
    }
  }

  // Genuine embedding obtained — cache and return.
  if (embedding) {
    if (contentHash) {
      embeddingCache.set(contentHash, embedding);
      await setCache(`emb:cache:${contentHash}`, embedding, 86400 * 7); // 7 days
    }
    return { embedding, isFallback: false };
  }

  // No genuine embedding. Only substitute a fallback when explicitly allowed.
  if (!fallbackAllowed) {
    throw new Error(
      `EMBEDDING_GENERATION_FAILED: Could not obtain a genuine embedding from '${embeddingModel}'. ` +
      `${apiErrorMessage || "No embedding provider available."} ` +
      `Refusing to store a non-semantic fallback vector. ` +
      `(Set EMBEDDING_ALLOW_FALLBACK=true only for local testing.)`
    );
  }

  console.warn(
    `⚠️ [EMBEDDING] Using NON-SEMANTIC fallback vector${apiErrorMessage ? ` after API issue: ${apiErrorMessage}` : ""}. ` +
    `This vector is NOT a semantic embedding.`
  );
  // Deliberately NOT cached, so a later genuine run can replace it.
  return { embedding: generateFallbackEmbedding(text), isFallback: true };
};

/**
 * Returns { embeddings: number[][], isFallback: boolean }.
 * isFallback is true if ANY vector in the batch was a non-semantic fallback.
 */
export const generateEmbeddings = async (textArray, contentHashes = []) => {
  const embeddings = [];
  let isFallback = false;
  for (let i = 0; i < textArray.length; i++) {
    const text = textArray[i];
    const hash = contentHashes[i] || null;
    const result = await generateEmbedding(text, hash);
    embeddings.push(result.embedding);
    if (result.isFallback) isFallback = true;
  }
  return { embeddings, isFallback };
};
