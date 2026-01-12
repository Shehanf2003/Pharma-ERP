import express from "express";
import {
  registerUser,
  login,
  logout,
  checkAuth,
} from "../controllers/auth.controller.js";
import { protectRoute, requireModuleAccess } from "../middleware/auth.middleware.js";

const router = express.Router();

import User from "../models/User.js";

router.post("/register", async (req, res, next) => {
    // Allow first user creation without auth
    try {
        const count = await User.countDocuments();
        if (count === 0) {
            return next();
        }
    } catch (err) {
        return next(err);
    }

    // Otherwise, protect
    protectRoute(req, res, () => {
         if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access Denied - Admin only" });
        }
        next();
    });
}, registerUser);

router.post("/login", login);
router.post("/logout", logout);
router.get("/check", protectRoute, checkAuth);

// Module Routes - Protected by RBAC
router.get("/inventory", protectRoute, requireModuleAccess("INVENTORY"), (req, res) => {
    res.status(200).json({ message: "Welcome to Inventory Module" });
});

router.get("/pos", protectRoute, requireModuleAccess("POS"), (req, res) => {
    res.status(200).json({ message: "Welcome to POS Module" });
});

router.get("/finance", protectRoute, requireModuleAccess("FINANCE"), (req, res) => {
    res.status(200).json({ message: "Welcome to Finance Module" });
});

router.get("/reporting", protectRoute, requireModuleAccess("REPORTING"), (req, res) => {
    res.status(200).json({ message: "Welcome to Reporting Module" });
});


export default router;
