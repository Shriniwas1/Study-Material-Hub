import Material from "../models/Material.js";
import Rating from "../models/Rating.js";

// GET all materials
export const getMaterials = async (req, res) => {
  try {
    const data = await Material.find().sort({ uploaded_at: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST create material
export const createMaterial = async (req, res) => {
  try {
    const { title, subject, description, pdf_url, cloudinary_public_id, uploader_id, uploader_name } = req.body;

    if (!title || !subject || !pdf_url || !uploader_id) {
      return res.status(400).json({ error: "Missing required metadata" });
    }

    const material = await Material.create({
      title,
      subject,
      description,
      pdf_url,
      cloudinary_public_id,
      uploader_id,
      uploader_name: uploader_name || "Anonymous"
    });

    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// GET a single material
export const getMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });
    res.json(material);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DELETE material
export const deleteMaterial = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) return res.status(404).json({ error: "Material not found" });

    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: "Material deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST rate material
export const rateMaterial = async (req, res) => {
  try {
    const { rating } = req.body;
    const materialId = req.params.id;
    const userId = req.user.id;

    await Rating.findOneAndUpdate(
      { material_id: materialId, user_id: userId },
      { rating },
      { upsert: true }
    );

    const ratings = await Rating.find({ material_id: materialId });
    const avg = ratings.reduce((acc, curr) => acc + curr.rating, 0) / ratings.length;

    await Material.findByIdAndUpdate(materialId, {
      average_rating: avg,
      ratings_count: ratings.length
    });

    res.json({ message: "Rating submitted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET user rating
export const getUserRating = async (req, res) => {
  try {
    const rating = await Rating.findOne({ 
      material_id: req.params.id, 
      user_id: req.user.id 
    });
    res.json({ rating: rating ? rating.rating : null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};