import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { User } from "../models/user.models.js";
import { Chat } from "../models/chat.models.js";
import bcrypt from "bcrypt";
import { deleteImageFromCloudinaryByUrl } from "../middleware/multer.middleware.js";
import { json } from "express";
import { Message } from "../models/message.models.js";

const extractPublicIdFromUrl = (url) => {
  const regex = /\/upload\/v\d+\/(.+?)(\.\w{3,4})?$/;
  const match = url.match(regex);

  if (match && match[1]) {
    return match[1]; // Return the matched public ID
  }

  return null;
};
export const UserProfile = asyncHandler(async (req, res) => {
  try {
    const logedInUser = req.user._id;
    if (!logedInUser) {
      return res.status(400).json(new apiError(400, "User need to login"));
    }
    const getProfile = await User.findOne({ _id: logedInUser });
    if (!getProfile) {
      return res.status(404).json(new apiError(404, "User not found"));
    }
    return res.status(200).json(new apiResponse(200, getProfile, "user found"));
  } catch (error) {
    console.log("user Profile", error);
  }
});
export const UserProfileById = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json(new apiError(400, "User id is required"));
    }
    const findReceiver = await User.findById(userId).select("-password");
    if (!findReceiver) {
      return res.status(404).json(new apiError(404, "User not found"));
    }
    return res
      .status(200)
      .json(new apiResponse(200, findReceiver, "user found"));
  } catch (error) {
    console.log("user Profile by id", error);
  }
});
export const GetAllUsers = asyncHandler(async (req, res) => {
  try {
    const loggedInUser = req.user._id;
    const searchQuery = req.query.search;
    const filterCondition = {
      _id: { $ne: loggedInUser },
      ...(searchQuery && {
        name: { $regex: searchQuery, $options: "i" }, // case-insensitive match
      }),
    };
    const filterUser = await User.find(filterCondition).select("-password");
    if (!filterUser) {
      return res.status(404).json(new apiError(404, "No users found"));
    }
    return res
      .status(200)
      .json(new apiResponse(200, filterUser, "users found"));
  } catch (error) {
    console.log("Get all user", error);
  }
});
export const UpdateUserProfile = asyncHandler(async (req, res) => {
  const user = req.user;
  const { new_name, new_email, new_password, status, quote } = req.body;

  if (!user) {
    throw new apiError(404, "User need to login");
    // res.status(404).json(new apiError(400, "User need to login"));
  }

  // Ensure at least one field is provided
  if (!new_name && !new_email && !new_password && !status && !quote) {
    throw new apiError(400, "At least one field is required for update.");
  }

  // Check if the new email is already used by another user (excluding the current user)
  if (new_email && new_email !== user.email) {
    const checkEmail = await User.findOne({ email: new_email });
    if (checkEmail) {
      throw new apiError(409, "This Email is already in use.");
    }
  }

  // Define hashedPassword before using it in updatedData
  let hashedPassword = user.password;
  if (new_password) {
    hashedPassword = await bcrypt.hash(new_password, 10);
  }

  // Prepare updated data
  const updatedData = {
    name: new_name || user.name,
    email: new_email || user.email,
    statusText: status || user.statusText,
    statusQuote: quote || user.statusQuote,
    password: hashedPassword,
  };

  // Update the user
  const updatedUser = await User.findByIdAndUpdate(user._id, updatedData, {
    new: true,
  });

  res
    .status(200)
    .json(
      new apiResponse(200, updatedUser, "User profile updated successfully.")
    );
});

export const UpdateProfilePicture = asyncHandler(async (req, res) => {
  const user = req.user;
  // console.log(req.file);

  if (!user) {
    throw new apiError(404, "User need to login");
    // res.status(404).json(new apiError(400, "User need to login"));
  }
  if (!req.file || !req.file?.path) {
    throw new apiError(400, "Image file is required");
    // res.status(400).json(new apiError(400, "image is required"));
  }
  const new_avatar = req.file.path;
  const existingImage = await extractPublicIdFromUrl(user.avatar);
  // console.log(existingImage);
  if (!existingImage) {
    throw new apiError(500, "there is problem while updateing profile picture");
    // res.status(500).json(500,"there is problem while updateing profile picture")
  }
  const updateUser = await User.findByIdAndUpdate(
    user._id,
    { avatar: new_avatar },
    { new: true }
  );
  const deleteImageFromCloudinary = await deleteImageFromCloudinaryByUrl(
    existingImage
  );
  if (!deleteImageFromCloudinary) {
    throw new apiError(500, "there is problem while profile deleting image");
  }
  res.status(200).json(200, updateUser, "Profile Picture Updated");
});

export const getUserwithChatDetails = asyncHandler(async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json(new apiError(400, "Chat ID are required"));
    }
    const chatData = await Chat.findById(chatId)
      .populate(
        "createdBy",
        "name email avatar createdAt statusText statusQuote"
      )
      .populate("members", "name email avatar createdAt statusText statusQuote")
      .populate("admins", "name email avatar createdAt statusText statusQuote");
    if (!chatData) {
      return res.status(404).json(new apiError(404, "chat not found"));
    }
    console.log(chatData);

    const isGroup = chatData.isGroupChat;

    let name = "";
    let email = "";
    let image = "";
    let groupDescription = "";
    let members = [];
    let admins = [];
    let createdBy = {};
    let createdAt = chatData.createdAt;
    let updatedAt = chatData.updatedAt;
    let otherUser_id = null;
    let userJoindAt = "";
    let statusText = "";
    let statusQuote = "";

    if (isGroup) {
      name = chatData.groupName || "Unnamed Group";
      image = chatData.groupImage || null;
      groupDescription = chatData.groupDescription || "";

      members = chatData.members.map((m) => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        avatar: m.avatar,
        createdAt: m.createdAt,
      }));

      admins = chatData.admins; // array of _ids

      createdBy = {
        _id: chatData.createdBy._id,
        name: chatData.createdBy.name,
        email: chatData.createdBy.email,
        avatar: chatData.createdBy.avatar,
        createdAt: chatData.createdBy.createdAt,
      };
      members = [...members, createdBy];
    } else {
      const otherUser = chatData.members.find(
        (m) => m._id.toString() !== loggedInUser._id.toString()
      );
      name = otherUser?.name || chatData.createdBy.name || "Unknown User";
      email = otherUser?.email;
      image = otherUser?.avatar || chatData.createdBy.avatar;
      otherUser_id = otherUser?._id || chatData.createdBy._id;
      userJoindAt = otherUser?.createdAt;
      statusText = otherUser?.statusText;
      statusQuote = otherUser?.statusQuote;
    }

    // Fetch lastMessage
    const lastMsg = await Message.findById(chatData.lastMessage);

    const formateChat = {
      _id: chatData._id,
      isGroupChat: isGroup,
      name,
      email,
      image,
      groupDescription: isGroup ? groupDescription : undefined,
      members: isGroup ? members : undefined,
      admins: isGroup ? admins : undefined,
      createdBy: isGroup ? createdBy : undefined,
      createdAt,
      updatedAt,
      userJoindAt: !isGroup ? userJoindAt : undefined,
      statusQuote,
      statusText,
      otherUser_id: !isGroup ? otherUser_id : undefined,
      lastMessage: lastMsg?.content || null,
      messageType: lastMsg?.messageType || null,
      lastMessageTime: lastMsg?.createdAt || chatData.updatedAt,
    };

    const sharedMediaDocs = await Message.find({
      chatId: chatId,
      media: { $exists: true, $ne: null },
    })
      .select("media createdAt")
      .sort("createdAt");
    console.log(sharedMediaDocs);

    const sharedMedia = [];

    sharedMediaDocs.forEach((msg) => {
      if (Array.isArray(msg.media)) {
        sharedMedia.push(...msg.media);
      } else if (msg.mediaUrl) {
        sharedMedia.push(msg.media);
      }
    });

    return res
      .status(200)
      .json(new apiResponse(200, { formateChat, sharedMedia }, "data found"));
  } catch (error) {
    console.log("userwithChatdetails error:", error);
  }
});
