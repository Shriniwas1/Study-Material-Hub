import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config/jwt.js";

export const protect = async (req, res, next) => {
  // Accept token from Authorization header OR ?token= query param
  // Query param support is needed for iframe src / direct link (browsers can't set headers there)
  const auth = req.headers.authorization;
  const queryToken = req.query.token;

  const token = (auth && auth.startsWith("Bearer "))
    ? auth.split(" ")[1]
    : queryToken || null;

  if (!token) {
    return res.status(401).json({ detail: "Unauthorized" });
  }

  try {
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