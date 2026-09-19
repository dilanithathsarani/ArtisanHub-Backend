import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
      minlength: [
        2,
        "Category name must contain at least 2 characters"
      ],
      maxlength: [
        50,
        "Category name cannot exceed 50 characters"
      ]
    },

    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      lowercase: true,
      trim: true
    },

    description: {
      type: String,
      trim: true,
      maxlength: [
        500,
        "Description cannot exceed 500 characters"
      ],
      default: ""
    },

    image: {
      type: String,
      trim: true,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Automatically create the slug from the category name
categorySchema.pre("validate", function () {
  if (this.name && (this.isModified("name") || !this.slug)) {
    this.slug = this.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
});

const Category =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema);

export default Category;