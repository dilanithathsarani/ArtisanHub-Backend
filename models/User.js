import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [
        2,
        "Name must contain at least 2 characters"
      ],
      maxlength: [
        50,
        "Name cannot exceed 50 characters"
      ]
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please enter a valid email address"
      ]
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [
        6,
        "Password must contain at least 6 characters"
      ],
      select: false
    },

    role: {
      type: String,
      enum: ["buyer", "seller", "admin"],
      default: "buyer"
    },

    phone: {
      type: String,
      trim: true,
      default: ""
    },

    avatar: {
      type: String,
      trim: true,
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    sellerApprovalStatus: {
      type: String,
      enum: [
        "not-applicable",
        "pending",
        "approved",
        "rejected"
      ],
      default: "not-applicable"
    },

    sellerProfile: {
      shopId: {
        type: String,
        trim: true,
        default: ""
      },

      shopName: {
        type: String,
        trim: true,
        maxlength: [
          100,
          "Shop name cannot exceed 100 characters"
        ],
        default: ""
      },

      slug: {
        type: String,
        lowercase: true,
        trim: true,
        default: ""
      },

      bio: {
        type: String,
        trim: true,
        maxlength: [
          1000,
          "Shop bio cannot exceed 1000 characters"
        ],
        default: ""
      },

      logo: {
        type: String,
        trim: true,
        default: ""
      },

      bannerImage: {
        type: String,
        trim: true,
        default: ""
      },

      city: {
        type: String,
        trim: true,
        default: ""
      },

      district: {
        type: String,
        trim: true,
        default: ""
      },

      country: {
        type: String,
        trim: true,
        default: "Sri Lanka"
      },

      craftCategories: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category"
        }
      ],

      contactEmail: {
        type: String,
        lowercase: true,
        trim: true,
        match: [
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
          "Please enter a valid contact email"
        ],
        default: ""
      },

      contactPhone: {
        type: String,
        trim: true,
        default: ""
      },

      facebook: {
        type: String,
        trim: true,
        default: ""
      },

      instagram: {
        type: String,
        trim: true,
        default: ""
      },

      website: {
        type: String,
        trim: true,
        default: ""
      }
    }
  },
  {
    timestamps: true
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  const salt = await bcrypt.genSalt(12);

  this.password = await bcrypt.hash(
    this.password,
    salt
  );
});

userSchema.methods.comparePassword = async function (
  enteredPassword
) {
  return bcrypt.compare(
    enteredPassword,
    this.password
  );
};

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;