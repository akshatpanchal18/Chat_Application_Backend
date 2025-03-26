import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";

const loginOption = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  path: "/",
  maxAge: 10 * 24 * 60 * 60 * 1000,
};
const logoutOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "None",
  path: "/",
};

const generateUserToken = async (user_id) => {
  try {
    const user = await User.findById(user_id);
    const token = user.generateToken();
    return { token };
  } catch (error) {
    throw new apiError(500, "something went Wrong while genrate token");
  }
};
