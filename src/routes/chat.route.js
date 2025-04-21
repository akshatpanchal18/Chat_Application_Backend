import Router from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  createChat,
  DeleteChatbyID,
  getAllChats,
  GetChatbyId,
} from "../controller/chat.controller.js";
import { uploadMedia } from "../middleware/multer.middleware.js";

const router = Router();

router.post(
  "/create-chat",
  verifyJwt,
  uploadMedia.single("groupImg"),
  createChat
);
// router.post("/create-chat", verifyJwt, createChat);
router.get("/get-all-chat", verifyJwt, getAllChats);
router.get("/get-chat/:chatId", verifyJwt, GetChatbyId);
router.delete("/delete-chat/:chatId", verifyJwt, DeleteChatbyID);

export default router;
