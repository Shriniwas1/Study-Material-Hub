import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/jwt.js";

export const protect = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ detail: "Unauthorized" });
  }

  try {
    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Most JWTs use 'id' or 'sub'. Ensure this matches your login controller logic
    const user = await User.findById(decoded.id || decoded.sub);
    
    if (!user) {
      return res.status(401).json({ detail: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ detail: "Invalid token" });
  }
};