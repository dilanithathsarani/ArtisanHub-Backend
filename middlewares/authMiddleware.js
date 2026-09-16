import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;

    if (
      !authorizationHeader ||
      !authorizationHeader.startsWith("Bearer ")
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required"
      });
    }

    const token = authorizationHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists"
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated"
      });
    }

    req.user = user;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token"
    });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource"
      });
    }

    next();
  };
};

export const approvedSellerOnly = (req, res, next) => {
  if (req.user.role !== "seller") {
    return res.status(403).json({
      success: false,
      message: "Only sellers can access this resource"
    });
  }

  if (req.user.sellerApprovalStatus !== "approved") {
    return res.status(403).json({
      success: false,
      message: "Your seller account has not been approved"
    });
  }

  next();
};