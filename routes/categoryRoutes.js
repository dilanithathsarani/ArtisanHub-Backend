import express from "express";

import {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  updateCategoryStatus
} from "../controllers/categoryController.js";

import {
  protect,
  authorize
} from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

// Admin-only routes
router.post(
  "/",
  protect,
  authorize("admin"),
  createCategory
);

router.put(
  "/:id",
  protect,
  authorize("admin"),
  updateCategory
);

router.put(
  "/:id/status",
  protect,
  authorize("admin"),
  updateCategoryStatus
);

export default router;