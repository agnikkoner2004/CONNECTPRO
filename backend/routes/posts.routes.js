// backend/routes/posts.routes.js
import { Router } from "express";
import {
  activeCheck,
  createPost,
  getAllPosts,
  deletePost,
  commentPost,
  get_comments_by_post,
  delete_comment_of_user,
  increment_likes,
  getFriendsPosts,
} from "../controllers/post.controllers.js";
import multer from "multer";
//import { getAllPosts } from "../controllers/user.controllers.js";

const router = Router();

// Define storage engine correctly
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname); // unique filename
  },
});

// Initialize multer with storage
const upload = multer({ storage });

// GET /api/posts → health check
router.route("/").get(activeCheck);

// POST /api/posts/post → create post with media upload
router.route("/post").post(upload.single("media"), createPost);

router.route("/posts").get(getAllPosts);
router.route("/friends").get(getFriendsPosts);
router.route("/delete_post").post(deletePost);
router.route("/comment").post(commentPost);
router.route("/get_comments").get(get_comments_by_post);
router.route("/delete_comment").delete(delete_comment_of_user);
router.route("/increment_post_like").post(increment_likes);

export default router;
