import express from "express";
import {
  getAllUsers,
  deleteUser,
  updateUser,
  adminResetPassword,
} from "../controllers/admin.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Apply protection to all routes in this file
router.use(protectRoute, adminRoute);

router.get("/users", getAllUsers);
router.delete("/users/:id", deleteUser);
router.patch("/users/:id", updateUser);
router.patch("/users/:id/reset-password", adminResetPassword);

export default router;
