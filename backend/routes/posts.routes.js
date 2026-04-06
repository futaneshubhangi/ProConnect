import { Router } from "express";
import {
  activeCheck,
  createPost,
  getPosts,
  toggleLike,
  addComment,
  getComments,
  deleteComment,
  deletePost,
  getMyPosts,
  updatePost,
  getEditPage   // ✅ ADD THIS
} from "../controllers/post.controller.js";

import upload from "../middleware/upload.middleware.js";


const router = Router();

router.get("/", activeCheck);

router.post("/create", upload.single("media"), createPost);

router.get("/feed",  getPosts);

router.post("/like/:postId", toggleLike);



router.get("/comments/:postId", getComments);
router.post("/comment/:postId", addComment);
router.delete("/comment/:commentId", deleteComment);

//Edit Post
router.get("/edit/:postId",  getEditPage);

// DELETE POST
router.delete("/:postId", deletePost);

// MY POSTS
router.get("/my-posts", getMyPosts);

// UPDATE POST
router.put("/:postId", upload.single("media"), updatePost);

export default router;