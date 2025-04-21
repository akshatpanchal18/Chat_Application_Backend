import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";
import { io } from "../app.js";
import mongoose from "mongoose";
import { sendMessageNotification } from "./notification.controller.js";
import { markMessageAsSeen } from "../utils/messageHelper.js";
import { onlineUsers } from "../socketHandler.js";
import { Notification } from "../models/notification.model.js";
import { SOCKET_EVENTS } from "../constants/event.js";

export const createMessage = asyncHandler(async (req, res) => {
  try {
    const { chatId, content } = req.body;
    console.log(req.body, "message body");

    const senderId = req.user._id;

    if (!chatId || !mongoose.isValidObjectId(chatId)) {
      return res
        .status(400)
        .json(new apiError(400, "Valid chatId is required"));
    }

    const findChat = await Chat.findById(chatId);
    if (!findChat) {
      return res.status(404).json(new apiError(404, "Chat not found"));
    }

    if (!senderId) {
      return res.status(400).json(new apiError(400, "User needs to login"));
    }

    if (!chatId || (!content && (!req.files || req.files.length === 0))) {
      return res.status(400).json(new apiError(400, "Invalid data"));
    }

    // Handle media uploads
    let mediaUrls = [];
    if (req.files && Array.isArray(req.files)) {
      mediaUrls = req.files.map((file) => file.path);
    }

    let finalMessageType = "text";
    if (mediaUrls.length > 0) {
      const mime = req.files[0].mimetype;
      finalMessageType = mime.startsWith("image")
        ? "image"
        : mime.startsWith("video")
        ? "video"
        : "file";
    }

    // Create and save the new message
    const newMessage = new Message({
      chatId,
      sender: senderId,
      content: content || "",
      seenBy: [],
      messageType: finalMessageType,
      media: mediaUrls.length > 0 ? mediaUrls : null,
    });

    const savedMessage = await newMessage.save();
    await Chat.findByIdAndUpdate(chatId, { lastMessage: savedMessage._id });

    const fullMessage = await Message.findById(savedMessage._id).populate(
      "sender",
      "_id name avatar"
    );
    if (!fullMessage) {
      return res
        .status(500)
        .json(new apiError(500, "Failed to populate message"));
    }
    io.to(chatId).emit(SOCKET_EVENTS.NEW_MESSAGE, fullMessage);
    console.log("📢 message emitted to:", chatId);
    await markMessageAsSeen(fullMessage);
    await sendMessageNotification(fullMessage);
    return res
      .status(201)
      .json(new apiResponse(201, fullMessage, "messages sent!!!"));
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ success: false, message: "Failed to send message" });
  }
});

export const GetAllmessages = asyncHandler(async (req, res) => {
  try {
    const { chatId } = req.params;
    // console.log("Received chatId:", chatId);
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json(new apiError(400, "Invalid Chat ID"));
    }
    const messages = await Message.find({
      chatId: chatId,
    })
      .populate("sender", "name avatar _id")
      .populate("seenBy", "name avatar _id")
      .sort({ createdAt: 1 });
    // console.log(messages);
    if (!messages) {
      res.status(404).json(new apiError(404, "messages not found"));
    }

    res.status(200).json(new apiResponse(200, messages, "messages found"));
  } catch (error) {
    console.log("all messages", error);
  }
});

export const GetAllSharedMedia = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  try {
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json(new apiError(400, "Invalid Chat ID"));
    }
    const media = await Message.find({
      chatId: chatId,
      media: { $exists: true, $ne: null },
    })
      .select("-sender -receiver -content -seenBy")
      .sort("createdAt");
    // if (!media.length) {
    //   res.status(404).json(new apiError(404, "no media found"));
    // }
    const groupedMedia = [];
    media.forEach((msg) => {
      const urls = msg.mediaUrl || [];

      groupedMedia.push(...urls);
    });

    res.status(200).json(new apiResponse(200, groupedMedia, "media found"));
  } catch (error) {
    console.log("shared media", error);
  }
});
