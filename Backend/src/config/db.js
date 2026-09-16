import mongoose from "mongoose";

const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // 1. Try primary Atlas URI
  if (uri) {
    try {
      await mongoose.connect(uri, {
        dbName: process.env.DB_NAME || "study_hub",
        serverSelectionTimeoutMS: 5000
      });
      console.log("✅ Primary MongoDB Connected Successfully");
      return;
    } catch (error) {
      console.warn("⚠️ Primary MongoDB Connection Warning:", error.message);
    }
  }

  // 2. Try local MongoDB
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/study_hub", {
      serverSelectionTimeoutMS: 2000
    });
    console.log("✅ Local MongoDB Connected Successfully");
    return;
  } catch (localErr) {
    console.warn("⚠️ Local MongoDB Connection Warning:", localErr.message);
  }

  // 3. Fallback: in-memory MongoDB (development only)
  try {
    console.log("🔄 Starting In-Memory MongoDB Server...");
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongod = await MongoMemoryServer.create();
    const memUri = mongod.getUri();
    await mongoose.connect(memUri, { dbName: "study_hub" });
    console.log("✅ MongoDB Connected Successfully (In-Memory Fallback Engine)");
    console.log("⚠️  WARNING: In-memory DB is ephemeral — data resets on restart.");
    // Graceful shutdown
    process.on("SIGINT", async () => { await mongod.stop(); process.exit(0); });
    process.on("SIGTERM", async () => { await mongod.stop(); process.exit(0); });
  } catch (memErr) {
    console.error("❌ All MongoDB connection strategies failed:", memErr.message);
    console.error("❌ The server will start but all DB operations will fail.");
  }

  console.log("🚀 Backend Server Ready");
};

export default connectDB;