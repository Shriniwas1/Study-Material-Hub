// src/controllers/auth.controller.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";

export const register = async (req, res) => {
  try {
    const { name, email, password, id } = req.body;

    // Check if variables are loaded
    if (!JWT_SECRET) {
      console.error("❌ FATAL ERROR: JWT_SECRET is not defined in .env");
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (!name || !email || !password || !id) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const user = await User.create({ 
      name, 
      email, 
      passwordHash: password, 
      id 
    });

    const token = jwt.sign({ id: user._id, sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({ 
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || user.passwordHash !== password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ 
      access_token: token,
      user: { id: user.id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};