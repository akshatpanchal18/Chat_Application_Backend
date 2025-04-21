import Router from "express";
import {
  LoginUser,
  LogoutUser,
  RegisterUser,
  ValidateCookie,
} from "../controller/auth.controller.js";
import { uploadProfile } from "../middleware/multer.middleware.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/register", uploadProfile.single("avatar"), RegisterUser);
router.post("/login", LoginUser);
router.get("/verify-token", ValidateCookie);
//protected routes
router.post("/logout", verifyJwt, LogoutUser);

export default router;
