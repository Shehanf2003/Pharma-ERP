import User from "../models/User.js";
import { generateToken } from "../lib/utils.js";
import { z } from "zod";

export const registerUser = async (req, res) => {
  const registerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    phoneNumber: z.string().optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(["admin", "employee"]).optional(),
    allowedModules: z
      .array(z.enum(["INVENTORY", "POS", "FINANCE", "REPORTING"]))
      .optional(),
  });

  try {
    const { name, email, phoneNumber, password, role, allowedModules } = registerSchema.parse(
      req.body
    );

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({
      name,
      email,
      phoneNumber,
      password,
      role: role || "employee",
      allowedModules: allowedModules || [],
    });

    if (user) {
      // Admin creates the user, so we don't log them in (generate token) for the new user.
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        allowedModules: user.allowedModules,
      });
    } else {
      res.status(400).json({ message: "Invalid user data" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.log("Error in register controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const login = async (req, res) => {
  const loginSchema = z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  });

  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await User.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      generateToken(user._id, res);

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        allowedModules: user.allowedModules,
      });
    } else {
      res.status(400).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0].message });
    }
    console.log("Error in login controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const logout = (req, res) => {
  try {
    res.cookie("jwt", "", { maxAge: 0 });
    res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.log("Error in logout controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const checkAuth = (req, res) => {
  try {
    res.status(200).json(req.user);
  } catch (error) {
    console.log("Error in checkAuth controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
