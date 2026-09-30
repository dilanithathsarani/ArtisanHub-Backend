import express from "express";

import {
  createSellerProfile,
  getMySellerProfile,
  getSellerProfileBySlug,
  updateSellerProfile
} from "../controllers/sellerProfileController.js";

import {
  protect,
  authorize,
  approvedSellerOnly
} from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get(
  "/me",
  protect,
  authorize("seller"),
  getMySellerProfile
);

router.post(
  "/",
  protect,
  approvedSellerOnly,
  createSellerProfile
);

router.put(
  "/me",
  protect,
  approvedSellerOnly,
  updateSellerProfile
);

router.get(
  "/:slug",
  getSellerProfileBySlug
);

export default router;