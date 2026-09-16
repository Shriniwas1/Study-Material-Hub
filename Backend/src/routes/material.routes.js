import express from "express";
import {
  createMaterial,
  getMaterials,
  getMaterial,
  deleteMaterial,
  rateMaterial,
  getUserRating,
  streamMaterialPdf
} from "../controllers/material.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getMaterials);
router.get("/:id/pdf", protect, streamMaterialPdf); // Must be before /:id to avoid conflict
router.get("/:id", getMaterial);

// Protected routes (require Login)
router.post("/", protect, createMaterial);
router.delete("/:id", protect, deleteMaterial);
router.post("/:id/rate", protect, rateMaterial);
router.get("/:id/user-rating", protect, getUserRating);

export default router;