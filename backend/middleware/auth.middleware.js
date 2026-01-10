import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protectRoute = async (req, res, next) => {
  try {
    const token = req.cookies.jwt;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No Token Provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded) {
      return res.status(401).json({ message: "Unauthorized - Invalid Token" });
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.log("Error in protectRoute middleware: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const requireModuleAccess = (moduleName) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
         return res.status(401).json({ message: "Unauthorized - User not authenticated" });
      }

      if (req.user.role === 'admin') {
        return next();
      }

      if (req.user.allowedModules && req.user.allowedModules.includes(moduleName)) {
        return next();
      }

      return res.status(403).json({ message: "Access Denied" });

    } catch (error) {
      console.log("Error in requireModuleAccess middleware: ", error.message);
      res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const adminRoute = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ message: "Access Denied - Admin only" });
};
