// src/scripts/retrievalSmokeTest.js
//
// Runs the real retrieval pipeline for a known session + question and prints the
// returned chunks, their scores, and the source citations (file + page) so you
// can confirm relevance and that citations map to the correct pages.
//
// Usage (from Backend/):
//   node src/scripts/retrievalSmokeTest.js --user <userId> --session <studySessionId> --q "your question" [--topK 5]

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";
import { retrieveSessionContext } from "../services/retrievalService.js";

const args = process.argv.slice(2);
const getArg = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : null; };

const userId = getArg("--user");
const sessionId = getArg("--session");
const question = getArg("--q");
const topK = parseInt(getArg("--topK") || "5", 10);

const run = async () => {
  if (!userId || !sessionId || !question) {
    console.error('Usage: node src/scripts/retrievalSmokeTest.js --user <id> --session <id> --q "question" [--topK 5]');
    process.exit(1);
  }
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set.");
    process.exit(1);
  }
  if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY not set — the query will be embedded with a NON-SEMANTIC fallback, so results reflect keyword matching only.");
  }

  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "study_hub",
    serverSelectionTimeoutMS: 10000
  });
  console.log("✅ Connected to MongoDB\n");

  const { chunks, hasRelevantContext, topScore } = await retrieveSessionContext({
    userId,
    studySessionId: new mongoose.Types.ObjectId(sessionId),
    queryText: question,
    topK
  });

  console.log(`Question : ${question}`);
  console.log(`topScore : ${topScore?.toFixed(4)}  |  hasRelevantContext: ${hasRelevantContext}  |  returned: ${chunks.length}\n`);

  chunks.forEach((c, i) => {
    console.log(`#${i + 1}  score=${c.score.toFixed(4)}  cite=[${c.fileName}, p.${c.pageNumber}, chunk ${c.chunkIndex}]`);
    console.log(`     ${(c.chunkText || "").slice(0, 200).replace(/\s+/g, " ")}…\n`);
  });

  if (!hasRelevantContext) {
    console.log('→ No chunk cleared MIN_RELEVANCE_SCORE; the app would answer "No such topic found in the document."');
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Retrieval test failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
