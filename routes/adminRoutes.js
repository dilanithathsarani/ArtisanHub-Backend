import express from "express";

import {
  getAllUsers,
  updateSellerApproval,
  updateUserStatus
} from "../controllers/adminController.js";

import {
  protect,
  authorize
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/users", getAllUsers);

router.put(
  "/sellers/:id/approval",
  updateSellerApproval
);

router.put(
  "/users/:id/status",
  updateUserStatus
);

export default router;