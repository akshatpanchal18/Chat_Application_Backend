import mongoose, { Schema } from "mongoose";

const MessageSchema = new Schema(
  {
    chatId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seenBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    ],
    content: { type: String }, // Text content
    messageType: {
      type: String,
      enum: ["text", "image", "video", "file"],
      default: "text",
    },
    media: [{ type: String }], // For image, video, or file
  },
  { timestamps: true }
);

export const Message = mongoose.model("Message", MessageSchema);
