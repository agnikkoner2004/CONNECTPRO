import { Router } from "express";
import multer from "multer";
import {
  register,
  login,
  uploadprofilepicture,
  updateUserProfile,
  updatePassword,
  getUserAndProfile,
  updateProfileData,
  getAllUserProfile,
  downloadResume,
  sendConnectionRequest,
  getMyConnectionsRequests,
  whatAreMyConnections,
  acceptConnectionRequest,
  getConnectionSuggestions,
} from "../controllers/user.controllers.js";

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// POST /api/users/update_profile_picture
router
  .route("/update_profile_picture")
  .post(upload.single("profilePicture"), uploadprofilepicture);

// POST /api/users/register
router.route("/register").post(register);

// POST /api/users/login
router.route("/login").post(login);

// POST /api/users/user_update
router.route("/user_update").post(updateUserProfile);

// POST /api/users/change_password
router.route("/change_password").post(updatePassword);

// GET /api/users/user/get_user_and_profile
router.route("/user/get_user_and_profile").get(getUserAndProfile);

// POST /api/users/update_profile_data
router.route("/update_profile_data").post(updateProfileData);

router.route("/user/get_all_users").get(getAllUserProfile);

router.route("/user/download_resume").get(downloadResume);

router.route("/user/send_connection_request").post(sendConnectionRequest);

router.route("/user/getConnectionRequest").get(getMyConnectionsRequests);

router.route("/user/user_connection_request").get(whatAreMyConnections);

router.route("/user/accept_connection_request").post(acceptConnectionRequest);

router.route("/user/connection_suggestions").get(getConnectionSuggestions);

export default router;
