import Material from "../models/Material.js";
import Rating from "../models/Rating.js";
import cloudinary from "../config/cloudinary.js";
import axios from "axios";

// GET all materials
export const getMaterials = async (req, res) => {
  try {
    const data = await Material.find().sort({ uploaded_at: -1 });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET /api/materials/:id/pdf — Proxy PDF through backend to bypass Cloudinary access restrictions
export const streamMaterialPdf = async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material || !material.pdf_url) {
      return res.status(404).json({ error: "PDF not found" });
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey    = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const publicId  = material.cloudinary_public_id;

    let downloadUrl;

    if (publicId && cloudName) {
      // Use Cloudinary Admin API download endpoint — accepts Basic Auth with API key/secret
      // This works regardless of account-level access restrictions on raw resource URLs
      downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/raw/download?public_id=${encodeURIComponent(publicId)}&type=upload`;
    } else {
      downloadUrl = material.pdf_url;
    }

    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      timeout: 30000,
      auth: { username: apiKey, password: apiSecret }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(material.title || 'document')}.pdf"`);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.removeHeader("Content-Security-Policy");
    res.removeHeader("X-Frame-Options");
    response.data.pipe(res);
  } catch (error) {
    console.error("[PDF STREAM ERROR]", error.message);
    res.status(502).json({ error: "Failed to load PDF. Please try again." });
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

    // Authorization ownership check
    const isOwner = (material.uploader_id === req.user.id) || 
                    (material.uploader_id === req.user._id?.toString()) ||
                    (material.uploader_id === req.user.id?.toString());
    
    if (!isOwner) {
      return res.status(403).json({ error: "Forbidden: You do not have permission to delete this material" });
    }

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