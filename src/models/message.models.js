import moonges, { Schema } from "mongoose";

const MessageSchema = new Schema({}, { timestamps: true });

export const Message = moonges.model("Message", MessageSchema);
