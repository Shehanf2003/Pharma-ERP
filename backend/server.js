import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import adminRoutes from "./routes/admin.route.js";
import User from "./models/User.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

const seedAdmin = async () => {
    try {
        const adminExists = await User.findOne({ email: "admin@test.com" });
        if (!adminExists) {
            console.log("Seeding admin user...");
            await User.create({
                name: "Super Admin",
                email: "admin@test.com",
                password: "123456",
                role: "admin",
                allowedModules: ["INVENTORY", "POS", "FINANCE", "REPORTING"]
            });
            console.log("Admin seeded.");
        }

        // Seed an employee too for testing listing
        const employeeExists = await User.findOne({ email: "employee@test.com" });
        if (!employeeExists) {
             console.log("Seeding employee user...");
             await User.create({
                 name: "John Doe",
                 email: "employee@test.com",
                 password: "password",
                 role: "employee",
                 allowedModules: ["POS"]
             });
             console.log("Employee seeded.");
        }

    } catch (e) {
        console.error("Seeding error:", e);
    }
};

app.listen(PORT, async () => {
  console.log("Server is running on port:" + PORT);
  await connectDB();
  await seedAdmin();
});
