// src/scripts/reembedDocuments.js
//
// Regenerates genuine embeddings for existing DocumentChunk rows and invalidates
// stale embedding / retrieval / RAG caches. Use after fixing the embedding
// response-shape bug, because vectors stored earlier may be non-semantic fallbacks.
//
// Usage (from Backend/):
//   node src/scripts/reembedDocuments.js            # only chunks marked as fallback
//   node src/scripts/reembedDocuments.js --all      # every chunk
//   node src/scripts/reembedDocuments.js --session <studySessionId>
//   node src/scripts/reembedDocuments.js --dry-run  # report only, no writes
//
// Requires a real GEMINI_API_KEY in the environment — the script refuses to run
// without one so it cannot "regenerate" fallback vectors into more fallbacks.

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import DocumentChunk from "../models/DocumentChunk.js";
import StudyDocument from "../models/StudyDocument.js";
import { generateEmbedding } from "../services/embeddingService.js";
import { delCachePattern, redisClient } from "../config/redis.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const all = args.includes("--all");
const sessionArgIdx = args.indexOf("--session");
const sessionId = sessionArgIdx >= 0 ? args[sessionArgIdx + 1] : null;

const run = async () => {
  if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is not set. Refusing to run — this script must produce genuine embeddings.");
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "study_hub",
    serverSelectionTimeoutMS: 10000
  });
  console.log("✅ Connected to MongoDB");

  const filter = {};
  if (!all) filter.embeddingIsFallback = true;
  if (sessionId) filter.studySessionId = new mongoose.Types.ObjectId(sessionId);

  const total = await DocumentChunk.countDocuments(filter);
  console.log(`Found ${total} chunk(s) to re-embed (filter: ${JSON.stringify(filter)}).`);
  if (total === 0 || dryRun) {
    console.log(dryRun ? "Dry run — no writes performed." : "Nothing to do.");
    await shutdown();
    return;
  }

  const affectedSessions = new Set();
  let done = 0, failed = 0;
  const cursor = DocumentChunk.find(filter).cursor();

  for (let chunk = await cursor.next(); chunk != null; chunk = await cursor.next()) {
    try {
      // No contentHash passed => bypass cache and force a fresh genuine embedding.
      const { embedding, isFallback } = await generateEmbedding(chunk.chunkText);
      if (isFallback) throw new Error("Received a fallback vector despite GEMINI_API_KEY being set.");
      chunk.embedding = embedding;
      chunk.embeddingIsFallback = false;
      await chunk.save();
      affectedSessions.add(chunk.studySessionId.toString());
      done++;
      if (done % 25 === 0) console.log(`  …${done}/${total}`);
    } catch (err) {
      failed++;
      console.warn(`  ⚠️ chunk ${chunk._id} failed: ${err.message}`);
    }
  }

  // Mark affected documents with the real embedding model.
  const realModel = process.env.EMBEDDING_MODEL || "text-embedding-004";
  for (const sid of affectedSessions) {
    await StudyDocument.updateMany({ studySessionId: sid }, { embeddingModel: realModel });
    // Invalidate retrieval + RAG caches so stale results are not served.
    delCachePattern(`retrieval:cache:${sid}:*`);
    delCachePattern(`rag:cache:${sid}:*`);
  }
  // Drop any genuine-but-now-recomputed embedding cache entries.
  delCachePattern(`emb:cache:*`);

  console.log(`✅ Re-embedded ${done} chunk(s), ${failed} failure(s). Invalidated caches for ${affectedSessions.size} session(s).`);
  await shutdown();
};

const shutdown = async () => {
  await mongoose.disconnect().catch(() => {});
  try { redisClient && redisClient.disconnect(); } catch {}
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Migration failed:", err.message);
  await shutdown();
});
