import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  name: String,
  passwordHash: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model("User", userSchema);
