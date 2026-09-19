import express from "express";

import {
  createProduct,
  getProducts,
  getProductById,
  getMyProducts,
  updateProduct,
  updateMyProductStatus,
  reviewProduct
} from "../controllers/productController.js";

import {
  protect,
  authorize,
  approvedSellerOnly
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", getProducts);

router.get(
  "/mine",
  protect,
  authorize("seller"),
  getMyProducts
);

router.post(
  "/",
  protect,
  approvedSellerOnly,
  createProduct
);

router.put(
  "/:id",
  protect,
  approvedSellerOnly,
  updateProduct
);

router.put(
  "/:id/status",
  protect,
  approvedSellerOnly,
  updateMyProductStatus
);

router.put(
  "/:id/review",
  protect,
  authorize("admin"),
  reviewProduct
);

router.get("/:id", getProductById);

export default router;