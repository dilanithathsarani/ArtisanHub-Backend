import mongoose from "mongoose";

import User from "../models/User.js";
import Category from "../models/Category.js";

const generateShopId = async () => {
  const latestSeller = await User.findOne({
    "sellerProfile.shopId": {
      $regex: /^SHP-\d{5}$/
    }
  })
    .sort({
      "sellerProfile.shopId": -1
    })
    .select("sellerProfile.shopId")
    .lean();

  let nextNumber = 1;

  if (latestSeller?.sellerProfile?.shopId) {
    const lastNumber = Number(
      latestSeller.sellerProfile.shopId.split("-")[1]
    );

    nextNumber = lastNumber + 1;
  }

  if (nextNumber > 99999) {
    throw new Error("Shop ID limit has been reached");
  }

  return `SHP-${String(nextNumber).padStart(5, "0")}`;
};

const createSlug = (shopName) => {
  return shopName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const validateCategories = async (categoryIds) => {
  if (!Array.isArray(categoryIds)) {
    return false;
  }

  const validIds = categoryIds.every((id) =>
    mongoose.Types.ObjectId.isValid(id)
  );

  if (!validIds) {
    return false;
  }

  const categoryCount = await Category.countDocuments({
    _id: {
      $in: categoryIds
    },
    isActive: true
  });

  return categoryCount === categoryIds.length;
};

export const createSellerProfile = async (
  req,
  res
) => {
  try {
    const {
      shopName,
      bio,
      logo,
      bannerImage,
      city,
      district,
      country,
      craftCategories,
      contactEmail,
      contactPhone,
      facebook,
      instagram,
      website
    } = req.body;

    if (
      !shopName ||
      !bio ||
      !city ||
      !district ||
      !contactEmail ||
      !contactPhone
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Shop name, bio, city, district, contact email and contact phone are required"
      });
    }

    const seller = await User.findById(req.user._id);

    if (!seller || seller.role !== "seller") {
      return res.status(403).json({
        success: false,
        message:
          "Only sellers can create a Shop profile"
      });
    }

    if (seller.sellerProfile?.shopId) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a Seller profile"
      });
    }

    const slug = createSlug(shopName);

    const existingShop = await User.findOne({
      $or: [
        {
          "sellerProfile.shopName": {
            $regex: `^${shopName.trim()}$`,
            $options: "i"
          }
        },
        {
          "sellerProfile.slug": slug
        }
      ]
    });

    if (existingShop) {
      return res.status(400).json({
        success: false,
        message:
          "A Shop with this name already exists"
      });
    }

    const selectedCategories =
      Array.isArray(craftCategories)
        ? craftCategories
        : [];

    const categoriesAreValid =
      await validateCategories(selectedCategories);

    if (!categoriesAreValid) {
      return res.status(400).json({
        success: false,
        message:
          "One or more craft categories are invalid"
      });
    }

    const shopId = await generateShopId();

    seller.sellerProfile = {
      shopId,
      shopName: shopName.trim(),
      slug,
      bio: bio.trim(),
      logo: logo?.trim() || "",
      bannerImage: bannerImage?.trim() || "",
      city: city.trim(),
      district: district.trim(),
      country: country?.trim() || "Sri Lanka",
      craftCategories: selectedCategories,
      contactEmail:
        contactEmail.toLowerCase().trim(),
      contactPhone: contactPhone.trim(),
      facebook: facebook?.trim() || "",
      instagram: instagram?.trim() || "",
      website: website?.trim() || ""
    };

    await seller.save();

    await seller.populate({
      path: "sellerProfile.craftCategories",
      select: "name slug"
    });

    return res.status(201).json({
      success: true,
      message:
        "Seller profile created successfully",
      seller: {
        id: seller._id,
        name: seller.name,
        email: seller.email,
        role: seller.role,
        sellerApprovalStatus:
          seller.sellerApprovalStatus,
        sellerProfile: seller.sellerProfile
      }
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
      message:
        "Unable to create Seller profile"
    });
  }
};

export const getMySellerProfile = async (
  req,
  res
) => {
  try {
    const seller = await User.findById(
      req.user._id
    )
      .select("-password")
      .populate({
        path: "sellerProfile.craftCategories",
        select: "name slug"
      });

    if (!seller?.sellerProfile?.shopId) {
      return res.status(404).json({
        success: false,
        message: "Seller profile not found"
      });
    }

    return res.status(200).json({
      success: true,
      seller
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve Seller profile"
    });
  }
};

export const getSellerProfileBySlug = async (
  req,
  res
) => {
  try {
    const seller = await User.findOne({
      role: "seller",
      isActive: true,
      sellerApprovalStatus: "approved",
      "sellerProfile.slug": req.params.slug,
      "sellerProfile.shopId": {
        $ne: ""
      }
    })
      .select(
        "name avatar sellerProfile createdAt"
      )
      .populate({
        path: "sellerProfile.craftCategories",
        select: "name slug"
      });

    if (!seller) {
      return res.status(404).json({
        success: false,
        message: "Seller Shop not found"
      });
    }

    return res.status(200).json({
      success: true,
      seller
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message:
        "Unable to retrieve Seller Shop"
    });
  }
};

export const updateSellerProfile = async (
  req,
  res
) => {
  try {
    const seller = await User.findById(
      req.user._id
    );

    if (!seller?.sellerProfile?.shopId) {
      return res.status(404).json({
        success: false,
        message: "Seller profile not found"
      });
    }

    const {
      shopName,
      bio,
      logo,
      bannerImage,
      city,
      district,
      country,
      craftCategories,
      contactEmail,
      contactPhone,
      facebook,
      instagram,
      website
    } = req.body;

    if (shopName !== undefined) {
      if (!shopName.trim()) {
        return res.status(400).json({
          success: false,
          message: "Shop name cannot be empty"
        });
      }

      const slug = createSlug(shopName);

      const existingShop = await User.findOne({
        _id: {
          $ne: seller._id
        },
        $or: [
          {
            "sellerProfile.shopName": {
              $regex: `^${shopName.trim()}$`,
              $options: "i"
            }
          },
          {
            "sellerProfile.slug": slug
          }
        ]
      });

      if (existingShop) {
        return res.status(400).json({
          success: false,
          message:
            "A Shop with this name already exists"
        });
      }

      seller.sellerProfile.shopName =
        shopName.trim();

      seller.sellerProfile.slug = slug;
    }

    if (craftCategories !== undefined) {
      const categoriesAreValid =
        await validateCategories(
          craftCategories
        );

      if (!categoriesAreValid) {
        return res.status(400).json({
          success: false,
          message:
            "One or more craft categories are invalid"
        });
      }

      seller.sellerProfile.craftCategories =
        craftCategories;
    }

    const fields = {
      bio,
      logo,
      bannerImage,
      city,
      district,
      country,
      contactEmail,
      contactPhone,
      facebook,
      instagram,
      website
    };

    Object.entries(fields).forEach(
      ([field, value]) => {
        if (value !== undefined) {
          seller.sellerProfile[field] =
            typeof value === "string"
              ? value.trim()
              : value;
        }
      }
    );

    if (contactEmail !== undefined) {
      seller.sellerProfile.contactEmail =
        contactEmail.toLowerCase().trim();
    }

    await seller.save();

    await seller.populate({
      path: "sellerProfile.craftCategories",
      select: "name slug"
    });

    return res.status(200).json({
      success: true,
      message:
        "Seller profile updated successfully",
      sellerProfile: seller.sellerProfile
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
      message:
        "Unable to update Seller profile"
    });
  }
};