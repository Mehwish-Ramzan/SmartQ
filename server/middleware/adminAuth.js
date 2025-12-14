// server/middleware/adminAuth.js
import jwt from "jsonwebtoken";
import Admin from "../models/Admin.js";

// Protect admin routes using the JWT we return on login
const adminAuth = async (req, res, next) => {
  try {
    // Expect: Authorization: Bearer <token>
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const token = authHeader.split(" ")[1];

    // Make sure you have JWT_SECRET set in your .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const admin = await Admin.findById(decoded.id).select("-passwordHash");
    if (!admin) {
      return res.status(401).json({ message: "Admin not found" });
    }

    req.admin = admin; // so routes can access req.admin later if needed
    next();
  } catch (err) {
    console.error("Auth error:", err.message);
    return res.status(401).json({ message: "Not authorized" });
  }
};

export default adminAuth;
