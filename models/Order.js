import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"]
    },

    productId: {
      type: String,
      required: [true, "Product ID is required"]
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true
    },

    image: {
      type: String,
      default: ""
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Product price cannot be negative"]
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
      validate: {
        validator: Number.isInteger,
        message: "Quantity must be a whole number"
      }
    },

    subtotal: {
      type: Number,
      required: [true, "Item subtotal is required"],
      min: [0, "Item subtotal cannot be negative"]
    }
  },
  {
    _id: false
  }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true
    },

    addressLine1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true
    },

    addressLine2: {
      type: String,
      trim: true,
      default: ""
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true
    },

    district: {
      type: String,
      required: [true, "District is required"],
      trim: true
    },

    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true
    },

    country: {
      type: String,
      trim: true,
      default: "Sri Lanka"
    }
  },
  {
    _id: false
  }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: [
        /^ORD-\d{5}$/,
        "Order ID must use the format ORD-00001"
      ]
    },

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"]
    },

    seller: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Seller is required"]
    },

    items: {
      type: [orderItemSchema],
      required: [true, "Order items are required"],
      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,
        message: "Order must contain at least one item"
      }
    },

    shippingAddress: {
      type: shippingAddressSchema,
      required: [true, "Shipping address is required"]
    },

    subtotal: {
      type: Number,
      required: [true, "Order subtotal is required"],
      min: [0, "Order subtotal cannot be negative"]
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: [0, "Delivery fee cannot be negative"]
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"]
    },

    paymentMethod: {
      type: String,
      enum: ["cash-on-delivery", "card"],
      required: [true, "Payment method is required"]
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending"
    },

    orderStatus: {
      type: String,
      enum: [
        "placed",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled"
      ],
      default: "placed"
    },

    cancellationReason: {
      type: String,
      trim: true,
      default: ""
    },

    deliveredAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

orderSchema.index({
  buyer: 1,
  createdAt: -1
});

orderSchema.index({
  seller: 1,
  orderStatus: 1,
  createdAt: -1
});

const Order =
  mongoose.models.Order ||
  mongoose.model("Order", orderSchema);

export default Order;