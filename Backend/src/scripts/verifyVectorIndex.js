// src/scripts/verifyVectorIndex.js
//
// Prints the Atlas Search / Vector Search index definition on the documentchunks
// collection so you can confirm dimensions and similarity metric. Read-only.
//
// Usage (from Backend/):
//   node src/scripts/verifyVectorIndex.js
//
// Expected for this app: a vectorSearch index named by VECTOR_INDEX_NAME
// (default "vector_index") on field "embedding", numDimensions 768
// (text-embedding-004), similarity "cosine", with userId + studySessionId
// declared as filter fields.

import dotenv from "dotenv";
dotenv.config();
import mongoose from "mongoose";

const EXPECTED_NAME = process.env.VECTOR_INDEX_NAME || "vector_index";
const EXPECTED_DIMS = 768;
const EXPECTED_SIMILARITY = "cosine";

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.DB_NAME || "study_hub",
    serverSelectionTimeoutMS: 10000
  });
  console.log("✅ Connected to MongoDB");

  const coll = mongoose.connection.db.collection("documentchunks");
  let indexes = [];
  try {
    indexes = await coll.listSearchIndexes().toArray();
  } catch (err) {
    console.error(`❌ Could not list search indexes (requires MongoDB Atlas): ${err.message}`);
    await mongoose.disconnect();
    process.exit(2);
  }

  if (indexes.length === 0) {
    console.warn("⚠️ No Atlas Search/Vector indexes found on 'documentchunks'. Vector search will fall back to in-app cosine scan.");
  }

  for (const idx of indexes) {
    console.log(`\n── Index: ${idx.name} (type=${idx.type || "search"}, status=${idx.status || "?"}, queryable=${idx.queryable}) ──`);
    const fields = idx.latestDefinition?.fields || idx.latestDefinition?.mappings?.fields || idx.definition?.fields;
    console.log(JSON.stringify(idx.latestDefinition || idx.definition, null, 2));

    // Best-effort validation for a vectorSearch index.
    const vectorField = Array.isArray(fields)
      ? fields.find(f => f.type === "vector")
      : null;
    if (vectorField) {
      const okName = idx.name === EXPECTED_NAME;
      const okDims = vectorField.numDimensions === EXPECTED_DIMS;
      const okSim = vectorField.similarity === EXPECTED_SIMILARITY;
      console.log(`  name == "${EXPECTED_NAME}"      : ${okName ? "✅" : `❌ (got "${idx.name}")`}`);
      console.log(`  numDimensions == ${EXPECTED_DIMS}      : ${okDims ? "✅" : `❌ (got ${vectorField.numDimensions})`}`);
      console.log(`  similarity == "${EXPECTED_SIMILARITY}"   : ${okSim ? "✅" : `❌ (got "${vectorField.similarity}")`}`);
      console.log(`  path == "embedding"           : ${vectorField.path === "embedding" ? "✅" : `❌ (got "${vectorField.path}")`}`);
    }
  }

  await mongoose.disconnect();
  process.exit(0);
};

run().catch(async (err) => {
  console.error("❌ Verification failed:", err.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
