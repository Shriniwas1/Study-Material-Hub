import dotenv from "dotenv";
dotenv.config();
import app from "./app.js";
import connectDB from "./config/db.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend Express API running on http://localhost:${PORT}`);
  connectDB().catch(err => console.warn("MongoDB connection warning:", err.message));
});
