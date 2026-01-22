import express from "express";
import { generateCloudinarySignature } from "../utils/cloudinarySignature.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// This route provides a signature for the frontend to upload directly to Cloudinary
router.post("/generate-signature", protect, (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const params = {
      timestamp: timestamp,
      folder: "study-materials"
    };

    const signature = generateCloudinarySignature(params, process.env.CLOUDINARY_API_SECRET);

    res.json({
      signature,
      timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to generate signature" });
  }
});

export default router;