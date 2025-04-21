import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import pkg from "cloudinary";
const { v2: cloudinary } = pkg;
import dotenv from "dotenv";

dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINERY_CLOUD_NAME,
  api_key: process.env.CLOUDINERY_API_KEY,
  api_secret: process.env.CLOUDINERY_API_SECRET,
});

const ProfilePicStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chatApplication/users",
    resource_type: "auto",
  },
});
export const uploadProfile = multer({
  storage: ProfilePicStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB
  },
});
const MediaStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "chatApplication/media",
    resource_type: "auto",
  },
});
export const uploadMedia = multer({
  storage: MediaStorage,
  limits: {
    fileSize: 50 * 1024 * 1024, // Limit file size to 50MB
  },
});

export const deleteImageFromCloudinaryByUrl = async (publicId) => {
  // const publicId = extractPublicIdFromUrl(imageUrl);
  // console.log(publicId);

  if (!publicId) {
    throw new Error("Invalid Image ID");
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    // console.log("line 51", result);
    return result;
  } catch (error) {
    // console.error("Error deleting image from Cloudinary:", error);
    throw new Error("Could not delete image");
  }
};
