import express from "express";

import {
  createReview,
  getProductReviews,
  updateMyReview,
  deleteMyReview,
  updateReviewVisibility
} from "../controllers/reviewController.js";

import {
  protect,
  authorize
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/product/:productId",
  getProductReviews
);

router.post(
  "/",
  protect,
  authorize("buyer"),
  createReview
);

router.put(
  "/:id",
  protect,
  authorize("buyer"),
  updateMyReview
);

router.delete(
  "/:id",
  protect,
  authorize("buyer"),
  deleteMyReview
);

router.put(
  "/:id/visibility",
  protect,
  authorize("admin"),
  updateReviewVisibility
);

export default router;