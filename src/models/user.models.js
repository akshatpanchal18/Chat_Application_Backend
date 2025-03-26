import moonges, { Schema } from "mongoose";
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
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: String,
      default:
        "https://res.cloudinary.com/dg8cwbkdy/image/upload/v1742968540/ckur7y3lbqw0pozz1equ.avif",
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    token: {
      type: String,
    },
  },

  {
    timestamps: true,
  }
);

userSchema.methods.generateToken = function () {
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
export const User = moonges.model("User", UserSchema);
