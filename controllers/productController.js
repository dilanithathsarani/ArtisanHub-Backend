import mongoose from "mongoose";

import Product from "../models/Product.js";
import Category from "../models/Category.js";

const generateProductId = async () => {
  const latestProduct = await Product.findOne({
    productId: {
      $regex: /^PRD-\d{5}$/
    }
  })
    .sort({
      productId: -1
    })
    .select("productId")
    .lean();

  let nextNumber = 1;

  if (latestProduct?.productId) {
    const lastNumber = Number(
      latestProduct.productId.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  if (nextNumber > 99999) {
    throw new Error("Product ID limit has been reached");
  }

  return `PRD-${String(nextNumber).padStart(5, "0")}`;
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      stock,
      images,
      category,
      materials,
      customizationAvailable
    } = req.body;

    if (
      !name ||
      !description ||
      price === undefined ||
      stock === undefined ||
      !category
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Name, description, price, stock and category are required"
      });
    }

    if (!mongoose.Types.ObjectId.isValid(category)) {
      return res.status(400).json({
        success: false,
        message: "Invalid category ID"
      });
    }

    const existingCategory = await Category.findOne({
      _id: category,
      isActive: true
    });

    if (!existingCategory) {
      return res.status(404).json({
        success: false,
        message: "Active category not found"
      });
    }

    const numericPrice = Number(price);
    const numericStock = Number(stock);

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Price must be a non-negative number"
      });
    }

    if (
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Stock must be a non-negative whole number"
      });
    }

    const productId = await generateProductId();

    const product = await Product.create({
      productId,
      name: name.trim(),
      description: description.trim(),
      price: numericPrice,
      stock: numericStock,
      images: Array.isArray(images) ? images : [],
      category,
      seller: req.user._id,
      materials: Array.isArray(materials)
        ? materials
        : [],
      customizationAvailable:
        customizationAvailable === true,
      status: "pending",
      rejectionReason: "",
      isActive: true
    });

    await product.populate([
      {
        path: "category",
        select: "name slug"
      },
      {
        path: "seller",
        select: "name email"
      }
    ]);

    return res.status(201).json({
      success: true,
      message:
        "Product created successfully and is waiting for admin approval",
      product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "A product ID conflict occurred. Please submit again."
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
      message: "Unable to create product"
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const {
      search,
      category,
      minPrice,
      maxPrice,
      customizationAvailable,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {
      status: "approved",
      isActive: true
    };

    if (search) {
      filter.$text = {
        $search: search
      };
    }

    if (category) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID"
        });
      }

      filter.category = category;
    }

    if (
      customizationAvailable === "true" ||
      customizationAvailable === "false"
    ) {
      filter.customizationAvailable =
        customizationAvailable === "true";
    }

    if (
      minPrice !== undefined ||
      maxPrice !== undefined
    ) {
      filter.price = {};

      if (minPrice !== undefined) {
        const minimum = Number(minPrice);

        if (!Number.isFinite(minimum) || minimum < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid minimum price"
          });
        }

        filter.price.$gte = minimum;
      }

      if (maxPrice !== undefined) {
        const maximum = Number(maxPrice);

        if (!Number.isFinite(maximum) || maximum < 0) {
          return res.status(400).json({
            success: false,
            message: "Invalid maximum price"
          });
        }

        filter.price.$lte = maximum;
      }
    }

    const pageNumber = Math.max(Number(page) || 1, 1);

    const limitNumber = Math.min(
      Math.max(Number(limit) || 10, 1),
      50
    );

    const skip = (pageNumber - 1) * limitNumber;

    const [products, totalProducts] = await Promise.all([
      Product.find(filter)
        .populate("category", "name slug")
        .populate("seller", "name avatar")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),

      Product.countDocuments(filter)
    ]);

    return res.status(200).json({
      success: true,
      count: products.length,
      totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(
        totalProducts / limitNumber
      ),
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve products"
    });
  }
};

export const getProductById = async (req, res) => {
  try {
    const identifier = req.params.id;

    const identifierFilter =
      mongoose.Types.ObjectId.isValid(identifier)
        ? {
            $or: [
              { _id: identifier },
              { productId: identifier }
            ]
          }
        : {
            productId: identifier
          };

    const product = await Product.findOne({
      ...identifierFilter,
      status: "approved",
      isActive: true
    })
      .populate("category", "name slug")
      .populate(
        "seller",
        "name avatar sellerApprovalStatus"
      );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve product"
    });
  }
};

export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.user._id
    })
      .populate("category", "name slug")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      products
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your products"
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    const product = await Product.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or you do not own it"
      });
    }

    const {
      name,
      description,
      price,
      stock,
      images,
      category,
      materials,
      customizationAvailable
    } = req.body;

    if (category !== undefined) {
      if (!mongoose.Types.ObjectId.isValid(category)) {
        return res.status(400).json({
          success: false,
          message: "Invalid category ID"
        });
      }

      const existingCategory = await Category.findOne({
        _id: category,
        isActive: true
      });

      if (!existingCategory) {
        return res.status(404).json({
          success: false,
          message: "Active category not found"
        });
      }

      product.category = category;
    }

    if (name !== undefined) {
      product.name = name.trim();
    }

    if (description !== undefined) {
      product.description = description.trim();
    }

    if (price !== undefined) {
      product.price = Number(price);
    }

    if (stock !== undefined) {
      product.stock = Number(stock);
    }

    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res.status(400).json({
          success: false,
          message: "Images must be an array"
        });
      }

      product.images = images;
    }

    if (materials !== undefined) {
      if (!Array.isArray(materials)) {
        return res.status(400).json({
          success: false,
          message: "Materials must be an array"
        });
      }

      product.materials = materials;
    }

    if (customizationAvailable !== undefined) {
      if (
        typeof customizationAvailable !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "customizationAvailable must be true or false"
        });
      }

      product.customizationAvailable =
        customizationAvailable;
    }

    product.status = "pending";
    product.rejectionReason = "";

    await product.save();

    await product.populate([
      {
        path: "category",
        select: "name slug"
      },
      {
        path: "seller",
        select: "name email"
      }
    ]);

    return res.status(200).json({
      success: true,
      message:
        "Product updated and submitted for admin approval",
      product
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
      message: "Unable to update product"
    });
  }
};

export const updateMyProductStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be true or false"
      });
    }

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        seller: req.user._id
      },
      {
        isActive
      },
      {
        new: true,
        runValidators: true
      }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found or you do not own it"
      });
    }

    return res.status(200).json({
      success: true,
      message: isActive
        ? "Product activated successfully"
        : "Product deactivated successfully",
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update product status"
    });
  }
};

export const reviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID"
      });
    }

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message:
          "Status must be approved or rejected"
      });
    }

    if (
      status === "rejected" &&
      (!rejectionReason || !rejectionReason.trim())
    ) {
      return res.status(400).json({
        success: false,
        message:
          "A rejection reason is required when rejecting a product"
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found"
      });
    }

    product.status = status;

    product.rejectionReason =
      status === "rejected"
        ? rejectionReason.trim()
        : "";

    await product.save();

    return res.status(200).json({
      success: true,
      message: `Product ${status} successfully`,
      product
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to review product"
    });
  }
};