import jwt from "jsonwebtoken";
import apiError from "../utils/apiError.js";
import { User } from "../models/user.models.js";
import asyncHandler from "../utils/asyncHandler.js";

export const verifyJwt = asyncHandler(async (req, res, next) => {
  const cookieToken = req.cookies.token;

  if (!cookieToken) {
    console.log("auth middeleware ln:10 ;401", "Unathorized request");
    return res.status(401).json(new apiError(401, "Unathorized Access"));
  }
  try {
    const decodeToken = jwt.verify(cookieToken, process.env.TOKEN_SECRET);
    // console.log("found token", decodeToken);

    const user = await User.findById(decodeToken?._id);
    if (!user) {
      throw new apiError(404, "Invalid Token");
      //   res.status(404).json(new apiError(404, "Invalid token user not found"))
    }
    req.user = user;
    next();
  } catch (error) {
    throw new apiError(401, error?.message || "Invalid access token");
  }
});
