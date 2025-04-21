import Router from "express";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  GetNotification,
  markAllNotificationasRead,
} from "../controller/notification.controller.js";

const router = Router();
router.get("/get-notification", verifyJwt, GetNotification);
router.patch("/update-notification", verifyJwt, markAllNotificationasRead);

export default router;
