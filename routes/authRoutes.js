import express from "express";
import {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile,
  forgotPassword,
  resetPassword
} from "../controllers/authController.js";

import {
  protect
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/forgotPassword", forgotPassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);
router.post("/resetPassword/:token", resetPassword);

router.get("/profile", protect, getMyProfile);
router.put("/profile", protect, updateMyProfile);

export default router;

