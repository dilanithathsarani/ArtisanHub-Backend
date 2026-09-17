import mongoose from "mongoose";
import User from "../models/User.js";

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({
      createdAt: -1
    });

    return res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve users",
      error: error.message
    });
  }
};

// Approve or reject a seller
export const updateSellerApproval = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid seller ID"
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be approved or rejected"
      });
    }

    const seller = await User.findOne({
      _id: id,
      role: "seller"
    });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller not found"
      });
    }

    seller.sellerApprovalStatus = status;

    await seller.save();

    return res.status(200).json({
      success: true,
      message: `Seller ${status} successfully`,
      seller
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update seller approval",
      error: error.message
    });
  }
};

// Activate or deactivate a user
export const updateUserStatus = async (req, res) => {
  try {
    const { isActive } = req.body;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID"
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false"
      });
    }

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account"
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    user.isActive = isActive;

    await user.save();

    return res.status(200).json({
      success: true,
      message: isActive
        ? "User activated successfully"
        : "User deactivated successfully",
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update user status",
      error: error.message
    });
  }
};