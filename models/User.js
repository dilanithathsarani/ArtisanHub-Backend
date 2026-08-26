import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"]
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
      minlength: [6, "Password must contain at least 6 characters"],
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
      default: ""
    },

    isActive: {
      type: Boolean,
      default: true
    },

    sellerApprovalStatus: {
      type: String,
      enum: ["not-applicable", "pending", "approved", "rejected"],
      default: "not-applicable"
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
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);

export default User;