import express from "express";
import {
  register,
  login,
  updateUserProfile,
  uploadProfilePicture,
  getUserAndProfile,
  updateProfileData,
  getAllUserProfiles,
  downloadProfile,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  getConnectionRequests,
  getConnections
} from "../controllers/user.controller.js";

import { authMiddleware } from "../middleware/authMiddleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// =======================
// AUTH
// =======================
router.post("/register", register);
router.post("/login", login);

// =======================
// PROFILE UPDATE (IMAGE + DATA)
// =======================
router.post(
  "/update_profile",               // ✅ check login
  upload.single("profilePicture"), // ✅ handle image upload
  updateUserProfile                // ✅ controller
);

router.post(
  "/update_profile_picture",
  upload.single("profilePicture"),
  uploadProfilePicture
);

// =======================
// PROFILE DATA (OPTIONAL APIs)
// =======================
router.post("/get_profile",  getUserAndProfile);
router.post("/update_profile_data", updateProfileData);

// =======================
// USERS / RESUME
// =======================
router.get("/network", getAllUserProfiles);
router.get("/download_resume", downloadProfile);

// =======================
// CONNECTION SYSTEM
// =======================
router.post("/send_connection_request",  sendConnectionRequest);
router.post("/accept_connection_request", acceptConnectionRequest);
router.post("/reject_connection_request",  rejectConnectionRequest);

router.get("/connection_requests",  getConnectionRequests);
router.get("/connections",  getConnections);

export default router;