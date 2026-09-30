import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Buyer is required"],
      unique: true
    },

    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"
      }
    ]
  },
  {
    timestamps: true
  }
);

const Wishlist =
  mongoose.models.Wishlist ||
  mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;