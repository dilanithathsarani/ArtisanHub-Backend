import sendEmail from "../utils/sendEmail.js";
import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import crypto from "crypto";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({
      email: normalizedEmail
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    const allowedRoles = ["buyer", "seller"];

    const selectedRole = allowedRoles.includes(role)
      ? role
      : "buyer";

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: selectedRole,
      phone: phone || "",
      sellerApprovalStatus:
        selectedRole === "seller" ? "pending" : "not-applicable"
    });

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message:
        selectedRole === "seller"
          ? "Seller registered successfully and is waiting for approval"
          : "User registered successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        sellerApprovalStatus: user.sellerApprovalStatus
      }
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "A user with this email already exists"
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to register user",
      error: error.message
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: normalizedEmail
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated"
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        isActive: user.isActive,
        sellerApprovalStatus: user.sellerApprovalStatus
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to log in",
      error: error.message
    });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile",
      error: error.message
    });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (phone !== undefined) {
      user.phone = phone;
    }

    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        success: false,
        message: messages[0]
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update profile",
      error: error.message
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address"
      });
    }

    const user = await User.findOne({
      email: normalizedEmail
    });

    const message =
      "If an account with that email exists, password reset instructions will be sent.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    return res.status(200).json({
      success: true,
      message
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to process the password reset request"
    });
  }
};


export const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body || {};

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to reset password",
      error: error.message,
    });
  }
};
