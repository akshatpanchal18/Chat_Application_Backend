import apiResponse from "../utils/apiResponse.js";
import apiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Chat } from "../models/chat.models.js";
import { Message } from "../models/message.models.js";
import { deleteImageFromCloudinaryByUrl } from "../middleware/multer.middleware.js";
import { io } from "../app.js";
import { onlineUsers } from "../socketHandler.js";
import { SOCKET_EVENTS } from "../constants/event.js";

const formatChatResponse = (chat, userId) => {
  const isGroup = chat.isGroupChat;

  let name = "";
  let image = "";
  let otherUser_id = null;

  if (isGroup) {
    name = chat.groupName || "Unnamed Group";
    image = chat.groupImage || null;
  } else {
    const otherUser = chat.members.find(
      (m) => m._id.toString() !== userId.toString()
    );
    name = otherUser?.name || chat.createdBy.name || "Unknown User";
    image = otherUser?.avatar || chat.createdBy.avatar;
    otherUser_id = otherUser?._id || chat.createdBy._id;
  }

  const lastMsg = chat.lastMessage;
  const lastMessage = lastMsg?.content || null;
  const messageType = lastMsg?.messageType;
  const lastMessageTime = lastMsg?.createdAt || chat.updatedAt;
  const createdBy = chat.createdBy?._id;

  return {
    _id: chat._id,
    isGroupChat: isGroup,
    name,
    image,
    lastMessage,
    lastMessageTime,
    messageType,
    otherUser_id,
    createdBy,
  };
};

export const createChat = asyncHandler(async (req, res) => {
  try {
    console.log(req.body);

    const loggedInUser = req.user;
    const { userIds, isGroupChat, chatName, description } = req.body;
    const groupImg = req?.file?.path;
    const members = Array.isArray(userIds) ? [...userIds] : [];

    // Handle One-to-One Chat
    if (!isGroupChat) {
      if (members.length !== 1) {
        return res
          .status(400)
          .json(
            new apiError(400, "One-to-one chat must have exactly 1 other user")
          );
      }

      const targetUserId = members[0];

      const existingChat = await Chat.findOne({
        isGroupChat: false,
        createdBy: { $in: [loggedInUser._id, targetUserId] }, // Ensure the chat has the logged-in user or target user
        members: {
          $in: [loggedInUser._id, targetUserId],
        }, // Exactly two members
      })
        .populate("members", "name avatar")
        .populate("createdBy", "name avatar")
        .populate("lastMessage");

      if (existingChat) {
        return res
          .status(200)
          .json(new apiResponse(200, existingChat, "Chat already exists"));
      }

      const newChat = await Chat.create({
        isGroupChat: false,
        members: [targetUserId],
        createdBy: loggedInUser._id,
      });

      const populatedChat = await Chat.findById(newChat._id)
        .populate("members", "name avatar")
        .populate("createdBy", "name avatar");

      const formatedChat = formatChatResponse(populatedChat, loggedInUser);
      // const targetUserSocketId = onlineUsers.get(targetUserId);
      // if (targetUserSocketId) {
      //   io.to(targetUserSocketId).emit(SOCKET_EVENTS.NEW_CHAT, formatedChat);
      // }
      const targetUserSocketId = onlineUsers.get(targetUserId.toString());
      if (targetUserSocketId) {
        io.to(targetUserSocketId).emit(SOCKET_EVENTS.NEW_CHAT, formatedChat);
        console.log(`🛩️ Emitted to target user: ${targetUserId}`);
      }

      const creatorSocketId = onlineUsers.get(loggedInUser._id.toString());
      if (creatorSocketId) {
        io.to(creatorSocketId).emit(SOCKET_EVENTS.NEW_CHAT, formatedChat);
        console.log(`🛩️ Emitted to creator: ${loggedInUser._id}`);
      }

      console.log(
        `🛩️ emmited to ${targetUserId} and socket id ${targetUserSocketId}`
      );

      return res
        .status(201)
        .json(new apiResponse(201, populatedChat, "New chat created"));
    }

    // Handle Group Chat
    if (isGroupChat) {
      if (members.length < 2) {
        return res
          .status(400)
          .json(
            new apiResponse(
              400,
              null,
              "Group must have at least 2 members excluding creator"
            )
          );
      }

      const groupChat = await Chat.create({
        isGroupChat: true,
        groupName: chatName,
        groupDescription: description,
        groupImage: groupImg || null,
        members, // Creator is NOT included here
        createdBy: loggedInUser._id,
        admins: [loggedInUser._id],
      });

      const populatedGroup = await Chat.findById(groupChat._id)
        .populate("members", "name avatar")
        .populate("admins", "name avatar")
        .populate("createdBy", "name avatar");

      const formatedGroupChat = formatChatResponse(
        populatedGroup,
        loggedInUser
      );
      members.forEach((memberId) => {
        const socketId = onlineUsers.get(memberId.toString());
        if (socketId) {
          io.to(socketId).emit(SOCKET_EVENTS.NEW_CHAT, formatedGroupChat);
          console.log("group newChat emitted to:", socketId);
        }
      });
      const creatorSocketId = onlineUsers.get(loggedInUser._id.toString());
      if (creatorSocketId) {
        io.to(creatorSocketId).emit(SOCKET_EVENTS.NEW_CHAT, formatedGroupChat);
        console.log(`🛩️ Emitted to creator: ${loggedInUser._id}`);
      }

      return res
        .status(201)
        .json(new apiResponse(201, populatedGroup, "New group created"));
    }
  } catch (error) {
    console.error("Error creating chat:", error);
    res.status(500).json(new apiError(500, "Failed to create chat"));
  }
});

export const getAllChats = asyncHandler(async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const search = req.query.search?.toLowerCase() || "";
    const chats = await Chat.find({
      $or: [{ createdBy: loggedInUserId }, { members: loggedInUserId }],
    })
      .sort({ updatedAt: -1 })
      .populate("members", "name avatar _id")
      .populate("admins", "name avatar _id")
      .populate("createdBy", "name avatar _id")
      .populate("lastMessage", "content sender createdAt messageType");
    // console.log(chats);

    // const formattedChats = chats
    //   .map((chat) => {
    //     const isGroup = chat.isGroupChat;

    //     let name = "";
    //     let image = "";
    //     let otherUser_id = null;

    //     if (isGroup) {
    //       name = chat.groupName || "Unnamed Group";
    //       image = chat.groupImage || null;
    //     } else {
    //       const otherUser = chat.members.find(
    //         (m) => m._id.toString() !== loggedInUserId.toString()
    //       );
    //       name = otherUser?.name || chat.createdBy.name || "Unknown User";
    //       image = otherUser?.avatar || chat.createdBy.avatar;
    //       otherUser_id = otherUser?._id || chat.createdBy._id;
    //     }

    //     const lastMsg = chat.lastMessage;
    //     const lastMessage = lastMsg?.content || null;
    //     const messageType = lastMsg?.messageType;
    //     const lastMessageTime = lastMsg?.createdAt || chat.updatedAt;

    //     return {
    //       _id: chat._id,
    //       isGroupChat: isGroup,
    //       name,
    //       image,
    //       lastMessage,
    //       lastMessageTime,
    //       messageType,
    //       otherUser_id,
    //     };
    //   })
    //   .filter((chat) => chat.name.toLowerCase().includes(search));
    const formattedChats = chats
      .map((chat) => formatChatResponse(chat, loggedInUserId))
      .filter((chat) => chat.name.toLowerCase().includes(search));

    res
      .status(200)
      .json(new apiResponse(200, formattedChats, "Chats fetched successfully"));
  } catch (error) {
    console.error("Error fetching chats:", error);
    res.status(500).json(new apiError(500, "Failed to fetch chats"));
  }
});

export const GetChatbyId = asyncHandler(async (req, res) => {
  try {
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId)
      .populate(
        "members",
        "name avatar email _id updatedAt createdAt statusTest statusQuote"
      )
      .populate(
        "createdBy",
        "name avatar email _id updatedAt createdAt statusTest statusQuote"
      ) // For group chats
      .select("-lastMessage"); // For group chats

    if (!chat) {
      return res.status(404).json(new apiError(404, "CHAT NOT FOUND")); // ✅ Add 'return' here
    }

    // const messages = await Message.find({ chat: chatId })
    //   .populate("sender", "name avatar")
    //   .sort({ createdAt: 1 });

    return res
      .status(200)
      .json(new apiResponse(200, chat, "Chat data fetched successfully"));
  } catch (error) {
    console.error("Error fetching chat:", error);
    if (!res.headersSent) {
      // ✅ Check if headers are already sent
      return res
        .status(500)
        .json(new apiError(500, "Failed to fetch chat by ID"));
    }
  }
});
export const DeleteChatbyID = asyncHandler(async (req, res) => {
  const { chatId } = req.params;
  if (!chatId) {
    console.log("401:chatId is required");
    return res.status(401).json(new apiError(401, "chatId is required"));
  }
  const findChat = await Chat.findById(chatId);
  if (!findChat) {
    console.log("404:chat not found");
    return res.status(404).json(new apiError(404, "no chat found"));
  }
  console.log(findChat);

  // const deleteChat = await Chat.findByIdAndDelete(chatId)
  // if(deleteChat){
  //   return res.status(400).json(new apiError(400,"there is problem while delete chat"))
  // }
  const findMessages = await Message.find({ chatId: chatId });
  if (!findMessages) {
    console.log("404:messages not found");
    return res.status(404).json(new apiError(404, "messages not found"));
  }
  const deleteMedia = async () => {
    const mediaUrls = findMessages
      .flatMap((message) => message.mediaUrls || []) // Flatten the array of mediaUrls
      .filter((url) => url); // Filter out any null or undefined values

    // Use Promise.all to wait for all delete operations to complete
    await Promise.all(
      mediaUrls.map(async (url) => {
        try {
          await deleteImageFromCloudinaryByUrl(url); // Await the deletion of each image
        } catch (error) {
          console.error(`Failed to delete image at ${url}:`, error); // Log any errors
        }
      })
    );
  };
  const allMediaDeleted = await deleteMedia();
  if (allMediaDeleted) {
    console.log("All media deleted successfully.");
  } else {
    console.log("Some media deletion failed.");
  }

  const deleteMessages = await Message.deleteMany({ chatId: chatId });
  if (deleteMessages) {
    console.log("400:there is problem while deleteing chat");

    return res
      .status(400)
      .json(new apiError(400, "there is problem while deleteing chat"));
  }
  console.log("Chats deleted");

  return res.status(200).json(new apiResponse(200, "Chats deleted"));
});
