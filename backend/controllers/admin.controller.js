import User from "../models/User.js";
import bcrypt from "bcryptjs";

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "employee" }).select(
      "_id name email phoneNumber allowedModules"
    );
    res.json(users);
  } catch (error) {
    console.log("Error in getAllUsers controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Ensure we are deleting an employee, mostly for safety
    if (user.role !== "employee") {
      return res.status(403).json({ message: "Cannot delete admin users via this API" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.log("Error in deleteUser controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phoneNumber, allowedModules } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (allowedModules) user.allowedModules = allowedModules;

    const updatedUser = await user.save();

    res.json({
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        allowedModules: updatedUser.allowedModules
    });
  } catch (error) {
    console.log("Error in updateUser controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const adminResetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    // Manually hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update directly bypassing pre-save hooks to avoid double hashing if any risk,
    // and because we don't have old password.
    const user = await User.findByIdAndUpdate(
      id,
      { password: hashedPassword },
      { new: true } // Return updated doc (though we don't send password back)
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.log("Error in adminResetPassword controller", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};