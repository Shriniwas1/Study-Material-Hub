import dotenv from "dotenv";
dotenv.config(); // Load this first

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import materialRoutes from "./routes/material.routes.js";
import cloudinaryRoutes from "./routes/cloudinary.routes.js";

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(",") : "*",
  credentials: true
}));

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/materials", materialRoutes);
app.use("/api/cloudinary", cloudinaryRoutes);

export default app;