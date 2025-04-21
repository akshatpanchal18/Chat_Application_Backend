import mongoose, { Schema } from "mongoose";

const ChatSchema = new Schema(
  {
    isGroupChat: { type: Boolean, default: false },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Users in chat
    groupName: { type: String },
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    groupImage: {
      type: String,
    },
    groupDescription: {
      type: String,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" }, // Reference to the last message
  },
  { timestamps: true }
);

export const Chat = mongoose.model("Chat", ChatSchema);
