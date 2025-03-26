import moonges, { Schema } from "mongoose";

const NotificationSchema = new Schema({}, { timestamps: true });

export const Notification = moonges.model("Message", NotificationSchema);
