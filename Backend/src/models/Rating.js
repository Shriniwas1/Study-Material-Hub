import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  id: String,
  material_id: String,
  user_id: String,
  rating: Number,
  created_at: { type: Date, default: Date.now }
});

export default mongoose.model("Rating", ratingSchema);
