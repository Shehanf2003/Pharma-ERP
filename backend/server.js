import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import inventoryRoutes from "./routes/inventory.routes.js";
import adminRoutes from "./routes/admin.route.js";
import posRoutes from "./routes/posRoutes.js";


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pos", posRoutes);


app.listen(PORT, async () => {
  console.log("Server is running on port:" + PORT);
  await connectDB();
});
