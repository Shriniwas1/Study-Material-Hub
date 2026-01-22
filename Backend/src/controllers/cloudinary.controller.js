import cloudinary from "../config/cloudinary.js";

export const generateSignature = (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // The parameters here MUST match the ones sent by the frontend
    const signature = cloudinary.v2.utils.api_sign_request(
      {
        timestamp: timestamp,
        folder: "study-materials",
      },
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      folder: "study-materials"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate signature" });
  }
};