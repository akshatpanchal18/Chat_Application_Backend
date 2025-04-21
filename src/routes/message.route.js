import Router from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  createMessage,
  GetAllmessages,
  GetAllSharedMedia,
} from "../controller/message.controller.js";
import { uploadMedia } from "../middleware/multer.middleware.js";

const router = Router();
router.post(
  "/send-message",
  verifyJwt,
  uploadMedia.array("media", 10),
  createMessage
);
router.get("/all-messages/:chatId", verifyJwt, GetAllmessages);
router.get("/all-media/:chatId", verifyJwt, GetAllSharedMedia);

export default router;
