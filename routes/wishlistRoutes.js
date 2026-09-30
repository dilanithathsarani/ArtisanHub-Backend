import express from "express";

import {
  getMyWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist
} from "../controllers/wishlistController.js";

import {
  protect,
  authorize
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(authorize("buyer"));

router.get(
  "/",
  getMyWishlist
);

router.post(
  "/",
  addToWishlist
);

router.delete(
  "/:productId",
  removeFromWishlist
);

router.delete(
  "/",
  clearWishlist
);

export default router;