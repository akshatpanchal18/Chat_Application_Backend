import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      require: true,
      unique: true,
    },
    statusText: {
      type: String,
      default: "Busy",
    },
    statusQuote: {
      type: String,
      default: "Believe in yourself",
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default:
        "https://res.cloudinary.com/dg8cwbkdy/image/upload/v1742968540/ckur7y3lbqw0pozz1equ.avif",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },

  {
    timestamps: true,
  }
);

UserSchema.methods.generateToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      // email: this.email,
    },
    process.env.TOKEN_SECRET,
    {
      expiresIn: process.env.TOKEN_EXPIRY,
    }
  );
};
export const User = mongoose.model("User", UserSchema);
