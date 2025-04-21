import { io } from "./app.js";
import { SOCKET_EVENTS } from "./constants/event.js";
import { Message } from "./models/message.models.js";
import { User } from "./models/user.models.js";

export const onlineUsers = new Map();
export default function SocketHandler(socket) {
  socket.on(SOCKET_EVENTS.SETUP, async (userData) => {
    // console.log("📨 Received setup for:", userData?.name);
    if (!userData?._id) {
      console.error("❌ Invalid userData received in setup:", userData);
      return;
    }
    // socket.join(userData._id); //for notifiaction purpose only
    socket.userId = userData._id;
    socket.user = userData;

    onlineUsers.set(userData._id, socket.id);

    socket.broadcast.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
      userId: userData._id,
      isOnline: true,
    });

    await User.findByIdAndUpdate(userData._id, { isOnline: true });

    io.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
      userId: userData._id,
      isOnline: true,
    });
    const onlineUserIds = Array.from(onlineUsers.keys()).filter(
      (id) => id !== userData._id
    );
    socket.emit(SOCKET_EVENTS.ONLINE_USERS, onlineUserIds);
    // console.log("user status set to Online", userData.name);
    console.log(
      "✅ Added to onlineUsers:",
      "USER_ID:",
      userData._id,
      "|",
      "USER_NAME:",
      userData?.name,
      "|",
      "SOCKET ID:",
      socket.id
    );
  });

  socket.on(SOCKET_EVENTS.JOIN_CHAT, async (data) => {
    console.log(
      "⛷️Received joinChat event with data:",
      "CHAT_ID:",
      data.chatId,
      "USER:",
      data.user.name
    );
    // console.log("Received joinChat event with data:", data);

    const { chatId, user } = data;
    if (!user || !user._id) {
      console.error("Invalid user data in joinChat:", user);
      return;
    }

    socket.join(chatId);
    socket.to(chatId).emit(SOCKET_EVENTS.USER_JOINED, {
      chatId,
      userId: user._id,
      name: user.name,
      message: `${user.name} joined the chat`,
    });
    try {
      const result = await Message.updateMany(
        {
          chatId: chatId,
          sender: { $ne: user._id }, // 👈 Don't mark sender's own messages
          seenBy: { $ne: user._id }, // 👈 Only if not already seen
        },
        {
          $addToSet: { seenBy: user._id }, // 👈 Add userId to seenBy
        }
      );
      // console.log("Update Result:", result);
    } catch (error) {
      console.error("Error marking messages as seen:", error);
    }
  });
  socket.on(SOCKET_EVENTS.LEAVE_CHAT, ({ chatId, user }) => {
    socket.leave(chatId);

    // Notify others in the room
    socket.to(chatId).emit(SOCKET_EVENTS.USER_LEFT, {
      chatId,
      userId: user._id,
      name: user.name,
      message: `${user.name} left the chat`,
    });

    console.log(`${user.name} left chat ${chatId}`);
  });

  // Handle typing indicator
  socket.on(SOCKET_EVENTS.TYPING, ({ chatId, userId, name }) => {
    // console.log("Emitting typing event:", chatId, userId, name);
    socket.to(chatId).emit(SOCKET_EVENTS.TYPING, { chatId, userId, name }); // ✅ emit name
  });

  socket.on(SOCKET_EVENTS.STOP_TYPING, (chatId) => {
    socket.to(chatId).emit(SOCKET_EVENTS.STOP_TYPING, chatId);
  });

  socket.on(
    SOCKET_EVENTS.MARK_AS_SEEN,
    async ({ messageId, chatId, userId }) => {
      console.log("markAsSeen trigered:", chatId, messageId, userId);

      try {
        await Message.updateOne(
          {
            _id: messageId,
            chatId,
            sender: { $ne: userId }, // not your own message
            seenBy: { $ne: userId }, // hasn't already seen
          },
          {
            $addToSet: { seenBy: userId },
          }
        );
        io.to(chatId).emit(SOCKET_EVENTS.MESSAGE_SEEN_UPDATE, {
          messageId,
          userId,
        });
        // socket.to(chatId).emit("messageSeenUpdate", {
        //   messageId,
        //   userId,
        // });

        // Optionally, emit update to sender to update seen indicators
        // socket.to(chatId).emit("messageSeenUpdate", {
        //   messageId,
        //   userId,
        // });
      } catch (error) {
        console.error("Error marking message as seen:", error);
      }
    }
  );

  //notification

  // socket.on("sendNotification", async (fullMessage) => {
  //   console.log("🔔 sendNotification received:", fullMessage);
  //   console.log("Current chat ID:", currentChatId); // Check if currentChatId is defined

  //   // Check if fullMessage is defined
  //   if (!fullMessage) {
  //     console.error("fullMessage is undefined");
  //     return; // Exit if fullMessage is not valid
  //   }

  //   await sendMessageNotification({ fullMessage, currentChatId });
  // });

  // Handle disconnect
  socket.on("disconnect", async () => {
    console.log("❌ Disconnected:", socket.id);

    if (socket.userId) {
      try {
        onlineUsers.delete(socket.userId);
        console.log(`Removed user ${socket.userId} from onlineUsers`);
        // Check if the user exists before updating their status
        const user = await User.findById(socket.userId);
        if (!user) {
          console.log(`User with ID ${socket.userId} not found`);
          return;
        }

        // Update the user's online status to false
        await User.findByIdAndUpdate(socket.userId, { isOnline: false });

        // Broadcast to other clients that this user is now offline
        socket.broadcast.emit(SOCKET_EVENTS.USER_STATUS_CHANGED, {
          userId: socket.userId,
          isOnline: false,
        });

        // Log for debugging
        console.log(`User ${socket.userId} set to offline.`);
        console.log(
          "User status set to offline",
          socket.user?.name || "Unknown User"
        );
      } catch (err) {
        console.error("Error setting user offline:", err.message);
      }
    } else {
      console.log("No userId found for socket. Could not set offline.");
    }
  });
}
