import mongoose from "mongoose";

import Review from "../models/Review.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";

const generateReviewId = async () => {
  const latestReview = await Review.findOne({
    reviewId: {
      $regex: /^REV-\d{5}$/
    }
  })
    .sort({
      reviewId: -1
    })
    .select("reviewId")
    .lean();

  let nextNumber = 1;

  if (latestReview?.reviewId) {
    const lastNumber = Number(
      latestReview.reviewId.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  if (nextNumber > 99999) {
    throw new Error("Review ID limit has been reached");
  }

  return `REV-${String(nextNumber).padStart(5, "0")}`;
};

const updateProductRating = async (productId) => {
  const result = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(
          productId
        ),
        isVisible: true
      }
    },
    {
      $group: {
        _id: "$product",
        averageRating: {
          $avg: "$rating"
        },
        reviewCount: {
          $sum: 1
        }
      }
    }
  ]);

  const ratingData = result[0] || {
    averageRating: 0,
    reviewCount: 0
  };

  await Product.findByIdAndUpdate(productId, {
    averageRating: Number(
      ratingData.averageRating.toFixed(1)
    ),
    reviewCount: ratingData.reviewCount
  });
};

export const createReview = async (req, res) => {
  try {
    const {
      productId,
      orderId,
      rating,
      comment
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(orderId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product or Order ID"
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rating must be a whole number between 1 and 5"
      });
    }

    if (
      typeof comment !== "string" ||
      comment.trim().length < 5
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Review comment must contain at least 5 characters"
      });
    }

    const product = await Product.findById(
      productId
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const order = await Order.findOne({
      _id: orderId,
      buyer: req.user._id,
      orderStatus: "delivered",
      "items.product": productId
    });

    if (!order) {
      return res.status(403).json({
        success: false,
        message:
          "You can only review Products from your delivered orders"
      });
    }

    const existingReview = await Review.findOne({
      product: productId,
      buyer: req.user._id,
      order: orderId
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message:
          "You have already reviewed this Product for this Order"
      });
    }

    const reviewId = await generateReviewId();

    const review = await Review.create({
      reviewId,
      product: productId,
      buyer: req.user._id,
      order: orderId,
      rating: numericRating,
      comment: comment.trim()
    });

    await updateProductRating(productId);

    await review.populate(
      "buyer",
      "name avatar"
    );

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      review
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "You have already reviewed this Product for this Order"
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(
        error.errors
      )[0].message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to submit Review"
    });
  }
};

export const getProductReviews = async (
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

    const product = await Product.findById(
      productId
    ).select(
      "productId name averageRating reviewCount"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    const reviews = await Review.find({
      product: productId,
      isVisible: true
    })
      .populate("buyer", "name avatar")
      .sort({
        createdAt: -1
      });

    return res.status(200).json({
      success: true,
      product,
      count: reviews.length,
      reviews
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve reviews"
    });
  }
};

export const updateMyReview = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID"
      });
    }

    const review = await Review.findOne({
      _id: id,
      buyer: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found or it does not belong to you"
      });
    }

    if (rating !== undefined) {
      const numericRating = Number(rating);

      if (
        !Number.isInteger(numericRating) ||
        numericRating < 1 ||
        numericRating > 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Rating must be a whole number between 1 and 5"
        });
      }

      review.rating = numericRating;
    }

    if (comment !== undefined) {
      if (
        typeof comment !== "string" ||
        comment.trim().length < 5
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Review comment must contain at least 5 characters"
        });
      }

      review.comment = comment.trim();
    }

    await review.save();

    await updateProductRating(review.product);

    await review.populate(
      "buyer",
      "name avatar"
    );

    return res.status(200).json({
      success: true,
      message: "Review updated successfully",
      review
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const message = Object.values(
        error.errors
      )[0].message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update Review"
    });
  }
};

export const deleteMyReview = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID"
      });
    }

    const review = await Review.findOne({
      _id: id,
      buyer: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message:
          "Review not found or it does not belong to you"
      });
    }

    const productId = review.product;

    await review.deleteOne();

    await updateProductRating(productId);

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully"
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to delete Review"
    });
  }
};

export const updateReviewVisibility = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { isVisible } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Review ID"
      });
    }

    if (typeof isVisible !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isVisible must be true or false"
      });
    }

    const review = await Review.findByIdAndUpdate(
      id,
      {
        isVisible
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!review) {
      return res.status(404).json({
        success: false,
        message: "Review not found"
      });
    }

    await updateProductRating(review.product);

    return res.status(200).json({
      success: true,
      message: isVisible
        ? "Review made visible"
        : "Review hidden successfully",
      review
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to update Review visibility"
    });
  }
};