import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import adminRoutes from "./routes/admin.route.js";
import posRoutes from "./routes/pos.routes.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import financeRoutes from "./routes/finance.route.js";
import shiftRoutes from "./routes/shift.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import prescriptionRoutes from "./routes/prescription.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);

connectDB().then(() => {
app.listen(PORT, async () => {
  console.log("Server is running on port:" + PORT);
});
});