import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: [
        /^PRD-\d{5}$/,
        "Product ID must use the format PRD-00001"
      ]
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      minlength: [
        2,
        "Product name must contain at least 2 characters"
      ],
      maxlength: [
        100,
        "Product name cannot exceed 100 characters"
      ]
    },

    description: {
      type: String,
      required: [true, "Product description is required"],
      trim: true,
      minlength: [
        10,
        "Product description must contain at least 10 characters"
      ],
      maxlength: [
        2000,
        "Product description cannot exceed 2000 characters"
      ]
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"]
    },

    stock: {
      type: Number,
      required: [true, "Product stock is required"],
      min: [0, "Product stock cannot be negative"],
      validate: {
        validator: Number.isInteger,
        message: "Product stock must be a whole number"
      }
    },

    images: {
      type: [String],
      default: []
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"]
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Product seller is required"]
    },

    materials: {
      type: [String],
      default: []
    },

    customizationAvailable: {
      type: Boolean,
      default: false
    },

    status: {
      type: String,
      enum: ["draft", "pending", "approved", "rejected"],
      default: "pending"
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },

    reviewCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  {
    timestamps: true
  }
);

// Enable text searching
productSchema.index({
  name: "text",
  description: "text",
  materials: "text"
});

// Improve common filtering operations
productSchema.index({
  category: 1,
  seller: 1,
  status: 1,
  isActive: 1
});

const Product =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema);

export default Product;