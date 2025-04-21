import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { io } from "../app.js";
import { Notification } from "../models/notification.model.js";
import { onlineUsers } from "../socketHandler.js";
import { Chat } from "../models/chat.models.js";
import { SOCKET_EVENTS } from "../constants/event.js";

export const sendMessageNotification = async (fullMessage) => {
  console.log("🔔 Notification: message received");

  const { chatId, sender, content, media } = fullMessage;

  try {
    const chat = await Chat.findById(chatId)
      .populate("members", "_id name")
      .populate("createdBy", "_id name");

    if (!chat) {
      console.error("Chat not found for notification.");
      return;
    }

    let recipientIds = [];

    if (chat.isGroupChat) {
      const senderId = sender._id.toString();
      const creatorId = chat.createdBy._id.toString();

      if (senderId === creatorId) {
        // Sender is the creator, send to all members except sender
        recipientIds = chat.members
          .map((user) => user._id.toString())
          .filter((id) => id !== senderId);
      } else {
        // Sender is a member, send to creator + all members except sender
        recipientIds = chat.members
          .map((user) => user._id.toString())
          .filter((id) => id !== senderId);

        if (!recipientIds.includes(creatorId)) {
          recipientIds.push(creatorId);
        }
      }
    } else {
      // One-to-one chat logic
      let recipientId;

      if (sender._id.toString() === chat.createdBy._id.toString()) {
        // Sender is creator, so recipient is the other member
        const otherMember = chat.members.find(
          (user) => user._id.toString() !== sender._id.toString()
        );
        recipientId = otherMember?._id.toString();
      } else {
        // Sender is not creator, so recipient is the creator
        recipientId = chat.createdBy._id.toString();
      }

      if (!recipientId) {
        console.warn("No recipient found in one-to-one chat.");
        return;
      }

      recipientIds = [recipientId];
    }

    console.log("🧑‍🤝‍🧑 Recipient IDs:", recipientIds);

    for (const recipientId of recipientIds) {
      // const room = io.sockets.adapter.rooms.get(recipientId);
      // const isOnline = room && room.size > 0;
      console.log("🗺️ Online Users Map:", Array.from(onlineUsers.entries()));

      const isOnline = onlineUsers.has(recipientId);
      const recipientSocketId = onlineUsers.get(recipientId);

      console.log("isOnline", isOnline);

      const payload = {
        message: fullMessage,
        receiver: recipientId,
      };

      if (isOnline) {
        console.log("📡 Payload sent:", payload, "to:", recipientId);
        // io.to(recipientId).emit("messageReceived", {
        //   fullMessage,
        //   recipientId,
        // });
        io.to(recipientSocketId).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, payload);

        console.log(`📡 Sent to user room: ${recipientId}`);
      } else {
        await Notification.create({
          receiver: recipientId,
          chatId,
          sender: sender,
          message: content || (media?.length ? "Media file" : "New message"),
        });
        console.log(`📥 Notification saved for offline user: ${recipientId}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in sendMessageNotification:", error.message);
  }
};

// Uncomment this if you plan to implement the GetNotification function
export const GetNotification = asyncHandler(async (req, res) => {
  const myId = req.user?._id;
  if (!myId) {
    console.log("user need to login");
  }
  const notifications = await Notification.find({
    receiver: myId,
    isRead: false,
  })
    .populate("sender", "name avatar")
    .populate("chatId", "groupName isGroupChat groupImage");
  if (!notifications) {
    return res
      .status(200)
      .json(new apiResponse(200, notifications, "no notifiaction found"));
  }
  return res
    .status(200)
    .json(new apiResponse(200, notifications, "notifiaction found"));
});
export const markAllNotificationasRead = asyncHandler(async (req, res) => {
  const myId = req.user?._id;

  if (!myId) {
    console.log("user need to login");
    return res.status(401).json({ message: "Unauthorized. Please login." });
  }

  const notifications = await Notification.updateMany(
    { receiver: myId, isRead: false },
    { $set: { isRead: true } }
  );

  if (notifications.modifiedCount > 0) {
    return res
      .status(200)
      .json(new apiResponse(200, "All notifications marked as read."));
  } else {
    return res
      .status(200)
      .json(new apiResponse(200, "No unread notifications found."));
  }
});
