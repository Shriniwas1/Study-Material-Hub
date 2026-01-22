import mongoose from "mongoose";

const connectDB = async () => {
  // Changed from MONGO_URL to MONGO_URI to match your .env file
  const uri = process.env.MONGO_URI;

  if (!uri) {
    console.error("❌ ERROR: MONGO_URI is undefined. Check your .env file variable names.");
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      dbName: process.env.DB_NAME // Ensure DB_NAME is also in your .env
    });
    console.log("✅ MongoDB Connected Successfully");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
};

export default connectDB;