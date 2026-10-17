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
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    const message =
      "If an account with that email exists, password reset instructions will be sent.";

    if (!user) {
      console.log(`⚠️ Forgot password requested for non-existing email: ${normalizedEmail}`);
      return res.status(200).json({
        success: true,
        message,
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

    const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl}/reset-password/${resetToken}`;

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 24px; border: 1px solid #eadad0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #965022; font-size: 24px; margin-top: 0;">ArtisanHub Password Reset</h2>
        <p style="color: #333333; font-size: 15px; line-height: 1.6;">Hello ${user.name || "there"},</p>
        <p style="color: #555555; font-size: 14px; line-height: 1.6;">
          We received a request to reset your password for your ArtisanHub account. Click the button below to set a new password:
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #965022; color: #ffffff; padding: 13px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            Reset My Password
          </a>
        </div>
        <p style="color: #555555; font-size: 13px; line-height: 1.6;">
          Or copy and paste this link into your browser:
        </p>
        <p style="background-color: #f7f7f7; padding: 12px; border-radius: 6px; word-break: break-all; font-size: 12px; color: #965022;">
          <a href="${resetUrl}" style="color: #965022; text-decoration: underline;">${resetUrl}</a>
        </p>
        <p style="color: #777777; font-size: 13px; line-height: 1.5; margin-top: 20px;">
          ⏱️ This link will expire in <strong>15 minutes</strong>.
        </p>
        <p style="color: #999999; font-size: 12px; line-height: 1.5;">
          If you did not request this password reset, please ignore this email and your password will remain unchanged.
        </p>
        <hr style="border: none; border-top: 1px solid #eeeeee; margin: 24px 0;" />
        <p style="color: #aaaaaa; font-size: 11px; text-align: center; margin-bottom: 0;">
          ArtisanHub &bull; Handmade &bull; Local &bull; Unique
        </p>
      </div>
    `;

    try {
      console.log(`📧 Sending password reset email to: ${user.email}...`);
      await sendEmail({
        to: user.email,
        subject: "ArtisanHub - Password Reset Link",
        text: `Reset your ArtisanHub password by visiting this link: ${resetUrl} (expires in 15 minutes)`,
        html: htmlContent,
      });
      console.log(`✅ Password reset email successfully sent to ${user.email}`);
    } catch (mailErr) {
      console.error("❌ Failed to send reset email:", mailErr.message);
    }

    console.log("\n========================================");
    console.log(`🔑 PASSWORD RESET LINK for ${user.email}:`);
    console.log(resetUrl);
    console.log("========================================\n");

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to process the password reset request",
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
