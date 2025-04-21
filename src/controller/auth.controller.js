import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

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

export const RegisterUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { avatar } = req.file.path;
  if (
    [name, email, password].some(
      (field) => typeof field !== "string" || field.trim() === ""
    )
  ) {
    // throw new apiError(400, "All fields are require !!");
    return res.status(400).json(new apiError(400, "all fields are required"));
  }
  if (!req.file || !req.file.path) {
    // throw new apiError(400, "Image file is required");
    return res.status(400).json(new apiError(400, "image is required"));
  }
  const existingUser = await User.findOne({ email: email });
  if (existingUser) {
    // throw new apiError(409, "this email is already in use");
    return res
      .status(400)
      .json(new apiError(400, "this email is already in use"));
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    avatar: avatar,
  });

  if (!user) {
    // throw new apiError(500, "something wrong while registring the user");
    return res
      .status(500)
      .json(new apiError(500, "something wrong while registring the user"));
  }
  await User.findByIdAndUpdate(findUser._id, { isOnline: true }, { new: true });

  const loggedinUser = await User.findById(findUser._id).select("-password");

  return res
    .status(201)
    .json(new apiResponse(201, loggedinUser, "User Registerd Successfully"));
});

export const LoginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  // console.log(email, password);

  if (!email || !password) {
    // throw new apiError(400, "This Fields cant't be Empty !!");
    return res
      .status(400)
      .json(new apiError(400, "This Fields cant't be Empty !!"));
  }
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    // throw new apiError(404, "User not Found");
    return res.status(404).json(new apiError(404, "User not Found"));
  }
  const isPasswordValid = await bcrypt.compare(password, findUser.password);
  if (!isPasswordValid) {
    // throw new apiError(401, "Invalid user credentials");
    return res.status(401).json(new apiError(401, "Inavalid Password"));
  }
  const { token } = await generateUserToken(findUser._id);
  await User.findByIdAndUpdate(findUser._id, { isOnline: true }, { new: true });

  const loggedinUser = await User.findById(findUser._id).select("-password");

  return res
    .status(200)
    .cookie("token", token, loginOption)
    .json(new apiResponse(200, loggedinUser, "User loggedin Sucessfully"));
});

export const LogoutUser = asyncHandler(async (req, res) => {
  const user = req.user;
  //   console.log(user);

  const findUser = await User.findById(user._id);
  if (!findUser) {
    throw new apiError(404, "User not Found");
    // res.status(404).json(new apiError(404, "User not Found"));
  }
  await User.findByIdAndUpdate(
    findUser._id,
    { isOnline: false },
    { new: true }
  );
  return res
    .status(200)
    .clearCookie("token", logoutOptions)
    .json(new apiResponse(200, {}, "User loggedOut Sucess"));
});

export const ValidateCookie = asyncHandler(async (req, res) => {
  const cookieToken = req.cookies.token;
  if (!cookieToken) {
    return res.status(401).json(new apiError(401, "Unathorized Access"));
  }
  jwt.verify(cookieToken, process.env.TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .json(new apiError(401, "token expired or invalid"));
    }
    res.status(200).json(new apiResponse(200, "token is valid"));
  });
});
