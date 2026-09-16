// src/controllers/auth.controller.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { JWT_SECRET, JWT_EXPIRES_IN } from "../config/jwt.js";

export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!JWT_SECRET) {
      console.error("❌ FATAL ERROR: JWT_SECRET is not defined in .env");
      return res.status(500).json({ error: "Server configuration error" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields (name, email, password)" });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: "Email is already registered" });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const userId = req.body.id || uuidv4();

    const user = await User.create({ 
      name, 
      email: email.toLowerCase(), 
      passwordHash, 
      id: userId
    });

    const token = jwt.sign({ id: user._id, sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({ 
      access_token: token,
      user: { id: user.id, _id: user._id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Please provide email and password" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Support both bcrypt hash and legacy plaintext fallback if migrating existing users
    let isMatch = false;
    if (user.passwordHash.startsWith("$2a$") || user.passwordHash.startsWith("$2b$")) {
      isMatch = await bcrypt.compare(password, user.passwordHash);
    } else {
      isMatch = (user.passwordHash === password);
      // Automatically upgrade password hash to bcrypt upon successful legacy login
      if (isMatch) {
        const salt = await bcrypt.genSalt(10);
        user.passwordHash = await bcrypt.hash(password, salt);
        await user.save();
      }
    }

    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, sub: user.id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({ 
      access_token: token,
      user: { id: user.id, _id: user._id, name: user.name, email: user.email } 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};