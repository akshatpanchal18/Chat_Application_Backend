import { io } from "../app.js";
import { SOCKET_EVENTS } from "../constants/event.js";
import { sendMessageNotification } from "../controller/notification.controller.js";
import { Chat } from "../models/chat.models.js";
import { onlineUsers } from "../socketHandler.js";

export const markMessageAsSeen = async (fullMessage) => {
  console.log("message received");

  const { chatId, sender, content, media } = fullMessage;

  try {
    // 1. Fetch chat with members and createdBy
    const chat = await Chat.findById(chatId)
      .populate("members", "_id name")
      .populate("createdBy", "_id name");

    if (!chat) {
      console.error("Chat not found for notification.");
      return;
    }

    // 2. Extract recipient IDs (exclude sender)
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
      const recipientSocketId = onlineUsers.get(recipientId);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit(
          SOCKET_EVENTS.MARK_MESSAGE_FOR_SEEN,
          fullMessage
        );
        console.log(`📡 Sent via socket to: ${recipientId}`);
      }
    }
  } catch (error) {
    console.error("❌ Error in sendMessageNotification:", error.message);
  }
};
