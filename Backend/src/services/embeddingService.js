// src/services/embeddingService.js
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
dotenv.config();

const provider = process.env.EMBEDDING_PROVIDER || "gemini";
const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-004";

let aiClient = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Memory cache for content hashes to prevent duplicate embedding calls
const embeddingCache = new Map();

/**
 * Generate a deterministic synthetic vector fallback (768 dimensions)
 * Used in local/dev environments when GEMINI_API_KEY is not supplied.
 */
const generateFallbackEmbedding = (text) => {
  const vector = new Array(768).fill(0);
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const index = (charCode * (i + 1)) % 768;
    vector[index] = (vector[index] + (charCode / 255)) % 1;
  }
  // Normalize vector
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0)) || 1;
  return vector.map(val => val / norm);
};

export const generateEmbedding = async (text, contentHash = null) => {
  if (contentHash && embeddingCache.has(contentHash)) {
    return embeddingCache.get(contentHash);
  }

  let embedding = null;

  if (aiClient && process.env.GEMINI_API_KEY) {
    try {
      const response = await aiClient.models.embedContent({
        model: embeddingModel,
        contents: text
      });
      if (response?.embedding?.values) {
        embedding = response.embedding.values;
      }
    } catch (error) {
      console.warn(`[EMBEDDING WARNING] Gemini API call failed: ${error.message}. Falling back to deterministic embedding.`);
    }
  }

  if (!embedding) {
    embedding = generateFallbackEmbedding(text);
  }

  if (contentHash) {
    embeddingCache.set(contentHash, embedding);
  }

  return embedding;
};

export const generateEmbeddings = async (textArray, contentHashes = []) => {
  const results = [];
  for (let i = 0; i < textArray.length; i++) {
    const text = textArray[i];
    const hash = contentHashes[i] || null;
    const emb = await generateEmbedding(text, hash);
    results.push(emb);
  }
  return results;
};
