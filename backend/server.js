import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";

// Route Imports
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
import salesRoutes from './routes/sales.routes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// 1. Add Express CORS middleware for standard HTTP requests
app.use(cors({
  origin: CLIENT_URL,
  credentials: true, // Allow cookies to be sent
}));

// 2. Configure Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Crucial for cookie-based auth in WebSockets
  },
});

// Make io accessible in your controllers via req.app.get('io')
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Client connected to Socket.IO:", socket.id);
  
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 5001;

// Standard Express Middlewares
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));

// Route Usages
app.use("/api/auth", authRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/pos", posRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/shifts", shiftRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use('/api/sales', salesRoutes);

// Database Connection & Server Start
connectDB().then(() => {
  server.listen(PORT, async () => {
    console.log("Server is running on port: " + PORT);
  });
}).catch((error) => {
  console.error("Failed to connect to database:", error);
});