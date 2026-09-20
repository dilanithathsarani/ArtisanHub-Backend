import express from "express";

import {
  createOrder,
  getMyOrders,
  getSellerOrders,
  getOrderById,
  updateOrderStatus,
  getAllOrders
} from "../controllers/orderController.js";

import {
  protect,
  authorize,
  approvedSellerOnly
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect,
  authorize("buyer"),
  createOrder
);

router.get(
  "/mine",
  protect,
  authorize("buyer"),
  getMyOrders
);

router.get(
  "/seller",
  protect,
  approvedSellerOnly,
  getSellerOrders
);

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  getAllOrders
);

router.put(
  "/:id/status",
  protect,
  approvedSellerOnly,
  updateOrderStatus
);

router.get(
  "/:id",
  protect,
  getOrderById
);

export default router;