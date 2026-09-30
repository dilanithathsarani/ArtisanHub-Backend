import mongoose from "mongoose";

import Wishlist from "../models/Wishlist.js";
import Product from "../models/Product.js";

const populateWishlist = async (wishlist) => {
  await wishlist.populate({
    path: "products",
    match: {
      status: "approved",
      isActive: true
    },
    select:
      "productId name price stock images averageRating reviewCount category seller",
    populate: [
      {
        path: "category",
        select: "name slug"
      },
      {
        path: "seller",
        select: "name avatar sellerProfile.shopName sellerProfile.slug"
      }
    ]
  });

  return wishlist;
};

export const getMyWishlist = async (
  req,
  res
) => {
  try {
    let wishlist = await Wishlist.findOne({
      buyer: req.user._id
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        buyer: req.user._id,
        products: []
      });
    }

    await populateWishlist(wishlist);

    return res.status(200).json({
      success: true,
      count: wishlist.products.length,
      wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve Wishlist"
    });
  }
};

export const addToWishlist = async (
  req,
  res
) => {
  try {
    const { productId } = req.body;

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid Product ID is required"
      });
    }

    const product = await Product.findOne({
      _id: productId,
      status: "approved",
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product is unavailable or has not been approved"
      });
    }

    let wishlist = await Wishlist.findOne({
      buyer: req.user._id
    });

    if (!wishlist) {
      wishlist = new Wishlist({
        buyer: req.user._id,
        products: []
      });
    }

    const alreadyExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (alreadyExists) {
      return res.status(400).json({
        success: false,
        message: "Product is already in the Wishlist"
      });
    }

    wishlist.products.push(productId);

    await wishlist.save();

    await populateWishlist(wishlist);

    return res.status(200).json({
      success: true,
      message: "Product added to Wishlist",
      wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to add Product to Wishlist"
    });
  }
};

export const removeFromWishlist = async (
  req,
  res
) => {
  try {
    const { productId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID"
      });
    }

    const wishlist = await Wishlist.findOne({
      buyer: req.user._id
    });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: "Wishlist not found"
      });
    }

    const productExists = wishlist.products.some(
      (id) => id.toString() === productId
    );

    if (!productExists) {
      return res.status(404).json({
        success: false,
        message: "Product is not in the Wishlist"
      });
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    );

    await wishlist.save();

    await populateWishlist(wishlist);

    return res.status(200).json({
      success: true,
      message: "Product removed from Wishlist",
      wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to remove Product from Wishlist"
    });
  }
};

export const clearWishlist = async (
  req,
  res
) => {
  try {
    let wishlist = await Wishlist.findOne({
      buyer: req.user._id
    });

    if (!wishlist) {
      wishlist = await Wishlist.create({
        buyer: req.user._id,
        products: []
      });
    }

    wishlist.products = [];

    await wishlist.save();

    return res.status(200).json({
      success: true,
      message: "Wishlist cleared successfully",
      wishlist
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to clear Wishlist"
    });
  }
};