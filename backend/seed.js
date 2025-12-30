import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js"; 

dotenv.config();

const seedAdmin = async () => {
  try {
   
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB...");

   
    const adminExists = await User.findOne({ email: "admin@test.com" });
    if (adminExists) {
      console.log("Admin already exists!");
      process.exit();
    }

   
    const admin = new User({
      name: "Super Admin",
      email: "admin@test.com",
      password: "123456", 
      role: "admin",
      allowedModules: ["INVENTORY", "POS", "FINANCE", "REPORTING"]
    });

    await admin.save();
    console.log("SUCCESS: Admin created successfully.");

  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    mongoose.connection.close();
    process.exit();
  }
};

seedAdmin();