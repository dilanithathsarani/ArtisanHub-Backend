import mongoose from "mongoose";

import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";

const generateNextOrderNumber = async (session) => {
  const latestOrder = await Order.findOne({
    orderId: {
      $regex: /^ORD-\d{5}$/
    }
  })
    .sort({
      orderId: -1
    })
    .select("orderId")
    .session(session)
    .lean();

  let nextNumber = 1;

  if (latestOrder?.orderId) {
    const lastNumber = Number(
      latestOrder.orderId.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  if (nextNumber > 99999) {
    throw new Error("Order ID limit has been reached");
  }

  return nextNumber;
};

const formatOrderId = (number) => {
  return `ORD-${String(number).padStart(5, "0")}`;
};

export const createOrder = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    const {
      shippingAddress,
      paymentMethod
    } = req.body;

    if (!shippingAddress) {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required"
      });
    }

    const requiredAddressFields = [
      "fullName",
      "phone",
      "addressLine1",
      "city",
      "district",
      "postalCode"
    ];

    const missingField = requiredAddressFields.find(
      (field) =>
        !shippingAddress[field] ||
        !String(shippingAddress[field]).trim()
    );

    if (missingField) {
      return res.status(400).json({
        success: false,
        message: `${missingField} is required`
      });
    }

    if (
      !["cash-on-delivery", "card"].includes(
        paymentMethod
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment method must be cash-on-delivery or card"
      });
    }

    const deliveryFee = Number(
      process.env.DELIVERY_FEE || 350
    );

    let createdOrders = [];

    await session.withTransaction(async () => {
      const cart = await Cart.findOne({
        buyer: req.user._id
      }).session(session);

      if (!cart || cart.items.length === 0) {
        const error = new Error("Your cart is empty");
        error.statusCode = 400;
        throw error;
      }

      const sellerGroups = new Map();

      for (const cartItem of cart.items) {
        const product = await Product.findOne({
          _id: cartItem.product,
          status: "approved",
          isActive: true
        }).session(session);

        if (!product) {
          const error = new Error(
            "One or more products are unavailable"
          );

          error.statusCode = 400;
          throw error;
        }

        if (cartItem.quantity > product.stock) {
          const error = new Error(
            `Only ${product.stock} item(s) of ${product.name} are available`
          );

          error.statusCode = 400;
          throw error;
        }

        const sellerId = product.seller.toString();

        if (!sellerGroups.has(sellerId)) {
          sellerGroups.set(sellerId, {
            seller: product.seller,
            items: [],
            subtotal: 0
          });
        }

        const group = sellerGroups.get(sellerId);

        const itemSubtotal =
          product.price * cartItem.quantity;

        group.items.push({
          product: product._id,
          productId: product.productId,
          name: product.name,
          image: product.images[0] || "",
          price: product.price,
          quantity: cartItem.quantity,
          subtotal: itemSubtotal
        });

        group.subtotal += itemSubtotal;
      }

      let nextOrderNumber =
        await generateNextOrderNumber(session);

      for (const group of sellerGroups.values()) {
        const orderId = formatOrderId(
          nextOrderNumber
        );

        nextOrderNumber += 1;

        const orderDocuments = await Order.create(
          [
            {
              orderId,
              buyer: req.user._id,
              seller: group.seller,
              items: group.items,
              shippingAddress: {
                fullName:
                  shippingAddress.fullName.trim(),
                phone: shippingAddress.phone.trim(),
                addressLine1:
                  shippingAddress.addressLine1.trim(),
                addressLine2:
                  shippingAddress.addressLine2?.trim() ||
                  "",
                city: shippingAddress.city.trim(),
                district:
                  shippingAddress.district.trim(),
                postalCode:
                  shippingAddress.postalCode.trim(),
                country:
                  shippingAddress.country?.trim() ||
                  "Sri Lanka"
              },
              subtotal: group.subtotal,
              deliveryFee,
              totalAmount:
                group.subtotal + deliveryFee,
              paymentMethod,
              paymentStatus:
                paymentMethod === "cash-on-delivery"
                  ? "pending"
                  : "pending",
              orderStatus: "placed"
            }
          ],
          {
            session
          }
        );

        createdOrders.push(orderDocuments[0]);
      }

      for (const cartItem of cart.items) {
        const result = await Product.updateOne(
          {
            _id: cartItem.product,
            stock: {
              $gte: cartItem.quantity
            }
          },
          {
            $inc: {
              stock: -cartItem.quantity
            }
          },
          {
            session
          }
        );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            "Product stock changed during checkout. Please try again."
          );

          error.statusCode = 409;
          throw error;
        }
      }

      cart.items = [];

      await cart.save({
        session
      });
    });

    createdOrders = await Order.find({
      _id: {
        $in: createdOrders.map((order) => order._id)
      }
    })
      .populate("seller", "name email")
      .populate("buyer", "name email");

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      orderCount: createdOrders.length,
      orders: createdOrders
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "An Order ID conflict occurred. Please try again."
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

    return res
      .status(error.statusCode || 500)
      .json({
        success: false,
        message:
          error.statusCode
            ? error.message
            : "Unable to place order"
      });
  } finally {
    await session.endSession();
  }
};

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({
      buyer: req.user._id
    })
      .populate("seller", "name email avatar")
      .sort({
        createdAt: -1
      });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve your orders"
    });
  }
};

export const getSellerOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      seller: req.user._id
    };

    if (status) {
      const allowedStatuses = [
        "placed",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid Order status"
        });
      }

      filter.orderStatus = status;
    }

    const orders = await Order.find(filter)
      .populate("buyer", "name email phone")
      .sort({
        createdAt: -1
      });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve seller orders"
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const identifier = req.params.id;

    const identifierFilter =
      mongoose.Types.ObjectId.isValid(identifier)
        ? {
            $or: [
              {
                _id: identifier
              },
              {
                orderId: identifier
              }
            ]
          }
        : {
            orderId: identifier
          };

    const order = await Order.findOne(
      identifierFilter
    )
      .populate("buyer", "name email phone")
      .populate("seller", "name email avatar");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    const userId = req.user._id.toString();

    const canAccess =
      req.user.role === "admin" ||
      order.buyer._id.toString() === userId ||
      order.seller._id.toString() === userId;

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        message:
          "You do not have permission to view this Order"
      });
    }

    return res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve Order"
    });
  }
};

export const updateOrderStatus = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Order ID"
      });
    }

    const allowedTransitions = {
      placed: ["confirmed", "cancelled"],
      confirmed: ["processing", "cancelled"],
      processing: ["shipped"],
      shipped: ["delivered"],
      delivered: [],
      cancelled: []
    };

    const order = await Order.findOne({
      _id: id,
      seller: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message:
          "Order not found or it does not belong to you"
      });
    }

    if (
      !allowedTransitions[order.orderStatus].includes(
        status
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Order cannot change from ${order.orderStatus} to ${status}`
      });
    }

    order.orderStatus = status;

    if (status === "delivered") {
      order.deliveredAt = new Date();

      if (
        order.paymentMethod === "cash-on-delivery"
      ) {
        order.paymentStatus = "paid";
      }
    }

    if (status === "cancelled") {
      order.cancellationReason =
        req.body.cancellationReason?.trim() ||
        "Cancelled by seller";

      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stock: item.quantity
            }
          }
        );
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order status updated successfully",
      order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to update Order status"
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.orderStatus = status;
    }

    const orders = await Order.find(filter)
      .populate("buyer", "name email")
      .populate("seller", "name email")
      .sort({
        createdAt: -1
      });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve orders"
    });
  }
};