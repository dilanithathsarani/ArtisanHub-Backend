import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    reviewId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: [
        /^REV-\d{5}$/,
        "Review ID must use the format REV-00001"
      ]
    },

    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"]
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"]
    },

    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: [true, "Order is required"]
    },

    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number"
      }
    },

    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [
        5,
        "Review comment must contain at least 5 characters"
      ],
      maxlength: [
        1000,
        "Review comment cannot exceed 1000 characters"
      ]
    },

    isVisible: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

reviewSchema.index(
  {
    product: 1,
    buyer: 1,
    order: 1
  },
  {
    unique: true
  }
);

reviewSchema.index({
  product: 1,
  isVisible: 1,
  createdAt: -1
});

const Review =
  mongoose.models.Review ||
  mongoose.model("Review", reviewSchema);

export default Review;