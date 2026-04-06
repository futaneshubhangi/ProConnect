import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {

    let resourceType = "image";

    if (file.mimetype.startsWith("video")) {
      resourceType = "video";
    }

    return {
      folder: "proconnect_posts",
      resource_type: resourceType,
      allowed_formats: ["jpg", "png", "jpeg", "mp4", "mov", "avi"]
    };
  }
});

const upload = multer({ storage });

export default upload;