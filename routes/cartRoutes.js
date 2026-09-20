import express from "express";

import {
  getMyCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from "../controllers/cartController.js";

import {
  protect,
  authorize
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("buyer"));

router.get("/", getMyCart);

router.post("/items", addToCart);

router.put(
  "/items/:productId",
  updateCartItem
);

router.delete(
  "/items/:productId",
  removeFromCart
);

router.delete("/", clearCart);

export default router;