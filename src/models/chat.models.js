import moonges, { Schema } from "mongoose";

const ChatSchema = new Schema({}, { timestamps: true });

export const Chat = moonges.model("Chat", ChatSchema);
