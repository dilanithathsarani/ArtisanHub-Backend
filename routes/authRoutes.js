import express from "express";
import {
  registerUser,
  loginUser,
  getMyProfile,
  updateMyProfile
} from "../controllers/authController.js";

import {
  protect
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);

router.get("/profile", protect, getMyProfile);
router.put("/profile", protect, updateMyProfile);

export default router;