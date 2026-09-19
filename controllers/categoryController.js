import mongoose from "mongoose";
import Category from "../models/Category.js";

// Public: get all active categories
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true
    }).sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve categories"
    });
  }
};

// Public: get one category using its slug
export const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({
      slug: req.params.slug,
      isActive: true
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve category"
    });
  }
};

// Admin: create a category
export const createCategory = async (req, res) => {
  try {
    const { name, description, image } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required"
      });
    }

    const existingCategory = await Category.findOne({
      name: name.trim()
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "A category with this name already exists"
      });
    }

    const category = await Category.create({
      name: name.trim(),
      description: description?.trim() || "",
      image: image?.trim() || ""
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category name or slug already exists"
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)[0].message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to create category"
    });
  }
};

// Admin: update a category
export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    const category = await Category.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty"
        });
      }

      category.name = name.trim();
    }

    if (description !== undefined) {
      category.description = description.trim();
    }

    if (image !== undefined) {
      category.image = image.trim();
    }

    await category.save();

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Category name or slug already exists"
      });
    }

    if (error.name === "ValidationError") {
      const message = Object.values(error.errors)[0].message;

      return res.status(400).json({
        success: false,
        message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update category"
    });
  }
};

// Admin: activate or deactivate a category
export const updateCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false"
      });
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { isActive },
      {
        new: true,
        runValidators: true
      }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Category activated successfully"
        : "Category deactivated successfully",
      category
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update category status"
    });
  }
};