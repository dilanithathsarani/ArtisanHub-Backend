import mongoose from "mongoose";

import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const prepareCartResponse = async (cart) => {
  await cart.populate({
    path: "items.product",
    select:
      "productId name price stock images status isActive",
    populate: {
      path: "category",
      select: "name slug"
    }
  });

  let totalAmount = 0;
  let totalItems = 0;

  const items = cart.items
    .filter((item) => item.product)
    .map((item) => {
      const subtotal =
        item.product.price * item.quantity;

      totalAmount += subtotal;
      totalItems += item.quantity;

      return {
        product: item.product,
        quantity: item.quantity,
        subtotal
      };
    });

  return {
    id: cart._id,
    buyer: cart.buyer,
    items,
    totalItems,
    totalAmount,
    createdAt: cart.createdAt,
    updatedAt: cart.updatedAt
  };
};

export const getMyCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({
      buyer: req.user._id
    });

    if (!cart) {
      cart = await Cart.create({
        buyer: req.user._id,
        items: []
      });
    }

    const preparedCart =
      await prepareCartResponse(cart);

    return res.status(200).json({
      success: true,
      cart: preparedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve cart"
    });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;

    if (
      !productId ||
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid product ID is required"
      });
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive whole number"
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

    let cart = await Cart.findOne({
      buyer: req.user._id
    });

    if (!cart) {
      cart = new Cart({
        buyer: req.user._id,
        items: []
      });
    }

    const existingItem = cart.items.find(
      (item) =>
        item.product.toString() === productId
    );

    const requestedQuantity = existingItem
      ? existingItem.quantity + numericQuantity
      : numericQuantity;

    if (requestedQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} item(s) are available`
      });
    }

    if (existingItem) {
      existingItem.quantity = requestedQuantity;
    } else {
      cart.items.push({
        product: productId,
        quantity: numericQuantity
      });
    }

    await cart.save();

    const preparedCart =
      await prepareCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: "Product added to cart",
      cart: preparedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to add Product to cart"
    });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(productId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid Product ID"
      });
    }

    const numericQuantity = Number(quantity);

    if (
      !Number.isInteger(numericQuantity) ||
      numericQuantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity must be a positive whole number"
      });
    }

    const cart = await Cart.findOne({
      buyer: req.user._id
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const item = cart.items.find(
      (cartItem) =>
        cartItem.product.toString() === productId
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Product is not in the cart"
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
        message: "Product is no longer available"
      });
    }

    if (numericQuantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} item(s) are available`
      });
    }

    item.quantity = numericQuantity;

    await cart.save();

    const preparedCart =
      await prepareCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: "Cart quantity updated",
      cart: preparedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update cart"
    });
  }
};

export const removeFromCart = async (req, res) => {
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

    const cart = await Cart.findOne({
      buyer: req.user._id
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    const itemExists = cart.items.some(
      (item) =>
        item.product.toString() === productId
    );

    if (!itemExists) {
      return res.status(404).json({
        success: false,
        message: "Product is not in the cart"
      });
    }

    cart.items = cart.items.filter(
      (item) =>
        item.product.toString() !== productId
    );

    await cart.save();

    const preparedCart =
      await prepareCartResponse(cart);

    return res.status(200).json({
      success: true,
      message: "Product removed from cart",
      cart: preparedCart
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to remove Product from cart"
    });
  }
};

export const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({
      buyer: req.user._id
    });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found"
      });
    }

    cart.items = [];

    await cart.save();

    return res.status(200).json({
      success: true,
      message: "Cart cleared successfully",
      cart: {
        id: cart._id,
        buyer: cart.buyer,
        items: [],
        totalItems: 0,
        totalAmount: 0
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to clear cart"
    });
  }
};