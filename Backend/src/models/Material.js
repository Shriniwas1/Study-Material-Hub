import mongoose from "mongoose";

const materialSchema = new mongoose.Schema({
  id: String,
  title: String,
  subject: String,
  description: String,
  pdf_url: String,
  cloudinary_public_id: String,
  uploader_id: String,
  uploader_name: String,
  ratings_count: { type: Number, default: 0 },
  average_rating: { type: Number, default: 0 },
  uploaded_at: { type: Date, default: Date.now }
});

export default mongoose.model("Material", materialSchema);
