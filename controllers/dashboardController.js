import User from "../models/User.js";
import Product from "../models/Product.js";
import Order from "../models/Order.js";
import Category from "../models/Category.js";
import Review from "../models/Review.js";

export const getSellerDashboard = async (
  req,
  res
) => {
  try {
    const sellerId = req.user._id;

    const [
      totalProducts,
      approvedProducts,
      pendingProducts,
      rejectedProducts,
      lowStockProducts,
      totalOrders,
      activeOrders,
      deliveredOrders,
      revenueResult
    ] = await Promise.all([
      Product.countDocuments({
        seller: sellerId
      }),

      Product.countDocuments({
        seller: sellerId,
        status: "approved"
      }),

      Product.countDocuments({
        seller: sellerId,
        status: "pending"
      }),

      Product.countDocuments({
        seller: sellerId,
        status: "rejected"
      }),

      Product.find({
        seller: sellerId,
        status: "approved",
        isActive: true,
        stock: {
          $lte: 5
        }
      })
        .select(
          "productId name stock price images"
        )
        .sort({
          stock: 1
        }),

      Order.countDocuments({
        seller: sellerId
      }),

      Order.countDocuments({
        seller: sellerId,
        orderStatus: {
          $in: [
            "placed",
            "confirmed",
            "processing",
            "shipped"
          ]
        }
      }),

      Order.countDocuments({
        seller: sellerId,
        orderStatus: "delivered"
      }),

      Order.aggregate([
        {
          $match: {
            seller: sellerId,
            orderStatus: "delivered",
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$subtotal"
            }
          }
        }
      ])
    ]);

    const totalRevenue =
      revenueResult[0]?.totalRevenue || 0;

    const recentOrders = await Order.find({
      seller: sellerId
    })
      .populate("buyer", "name email")
      .sort({
        createdAt: -1
      })
      .limit(5);

    return res.status(200).json({
      success: true,
      dashboard: {
        products: {
          total: totalProducts,
          approved: approvedProducts,
          pending: pendingProducts,
          rejected: rejectedProducts
        },

        orders: {
          total: totalOrders,
          active: activeOrders,
          delivered: deliveredOrders
        },

        totalRevenue,
        lowStockProducts,
        recentOrders
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve Seller dashboard"
    });
  }
};

export const getAdminDashboard = async (
  req,
  res
) => {
  try {
    const [
      totalUsers,
      totalBuyers,
      totalSellers,
      pendingSellers,
      totalCategories,
      totalProducts,
      pendingProducts,
      approvedProducts,
      totalOrders,
      activeOrders,
      deliveredOrders,
      totalReviews,
      revenueResult
    ] = await Promise.all([
      User.countDocuments(),

      User.countDocuments({
        role: "buyer"
      }),

      User.countDocuments({
        role: "seller"
      }),

      User.countDocuments({
        role: "seller",
        sellerApprovalStatus: "pending"
      }),

      Category.countDocuments(),

      Product.countDocuments(),

      Product.countDocuments({
        status: "pending"
      }),

      Product.countDocuments({
        status: "approved"
      }),

      Order.countDocuments(),

      Order.countDocuments({
        orderStatus: {
          $in: [
            "placed",
            "confirmed",
            "processing",
            "shipped"
          ]
        }
      }),

      Order.countDocuments({
        orderStatus: "delivered"
      }),

      Review.countDocuments(),

      Order.aggregate([
        {
          $match: {
            orderStatus: "delivered",
            paymentStatus: "paid"
          }
        },
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: "$totalAmount"
            }
          }
        }
      ])
    ]);

    const totalRevenue =
      revenueResult[0]?.totalRevenue || 0;

    const recentOrders = await Order.find()
      .populate("buyer", "name email")
      .populate(
        "seller",
        "name email sellerProfile.shopName"
      )
      .sort({
        createdAt: -1
      })
      .limit(5);

    return res.status(200).json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          buyers: totalBuyers,
          sellers: totalSellers,
          pendingSellers
        },

        categories: {
          total: totalCategories
        },

        products: {
          total: totalProducts,
          pending: pendingProducts,
          approved: approvedProducts
        },

        orders: {
          total: totalOrders,
          active: activeOrders,
          delivered: deliveredOrders
        },

        totalReviews,
        totalRevenue,
        recentOrders
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve Admin dashboard"
    });
  }
};