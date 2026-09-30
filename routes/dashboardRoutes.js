import express from "express";

import {
  getSellerDashboard,
  getAdminDashboard
} from "../controllers/dashboardController.js";

import {
  protect,
  authorize,
  approvedSellerOnly
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/seller",
  protect,
  approvedSellerOnly,
  getSellerDashboard
);

router.get(
  "/admin",
  protect,
  authorize("admin"),
  getAdminDashboard
);

export default router;