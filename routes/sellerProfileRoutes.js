import express from "express";

import {
  createSellerProfile,
  getMySellerProfile,
  getPublicArtisans,
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

router.get(
  "/",
  getPublicArtisans
);

export default router;