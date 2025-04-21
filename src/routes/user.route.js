import Router from "express";
import { uploadProfile } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import {
  GetAllUsers,
  getUserwithChatDetails,
  UpdateProfilePicture,
  UpdateUserProfile,
  UserProfile,
  UserProfileById,
} from "../controller/user.controller.js";

const router = Router();

//protected routes
router.get("/user-profile", verifyJwt, UserProfile);
router.get("/get-user-chatdetails/:chatId", verifyJwt, getUserwithChatDetails);
router.get("/receiver-profile/:userId", verifyJwt, UserProfileById);
router.get("/all-users", verifyJwt, GetAllUsers);
router.put("/update-profile", verifyJwt, UpdateUserProfile);
router.put(
  "/update-profile-pic",
  verifyJwt,
  uploadProfile.single("new_avatar"),
  UpdateProfilePicture
);

export default router;
