import Profile from "../models/profile.model.js";
import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";
import cloudinary from "../config/cloudinary.js";

export const activeCheck = async (req, res) => {
  return res.status(200).json({ message: "Running" });
};

export const createPost = async (req, res) => {
  try {

    const userId = req.session.userId;
    const { body } = req.body;


    let media = "";
    let fileType = "";

    if (req.file) {
      media = req.file.path;              // Cloudinary URL
      fileType = req.file.mimetype;       // image/video type
    }

    

    const newPost = await Post.create({
      userId,
      body,
      media,
      fileType
    });

    res.redirect("/feed");

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};

export const getPosts = async (req, res) => {
  try {

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;

    const skip = (page - 1) * limit;

    const posts = await Post.find({ active: true })
      .populate("userId", "name username profilePicture")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    return res.status(200).json({
      page,
      limit,
      posts
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};


export const toggleLike = async (req, res) => {
  try {

    //const userId = req.userId;
    const userId = req.session.userId;
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        message: "Post not found"
      });
    }

    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    const alreadyLiked = post.likes.some(
      id => id.toString() === userId
    );

    if (alreadyLiked) {

      post.likes = post.likes.filter(
        id => id.toString() !== userId
      );

      await post.save();
      res.redirect("/feed");
      

    } else {

      post.likes.push(userId);

      await post.save();

      res.redirect("/feed");
    }

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};


export const addComment = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { postId } = req.params;
    const { body } = req.body;

    if (!body) return res.send("Comment cannot be empty");

    await Comment.create({
      userId,
      postId,
      body
    });

    res.redirect("back");

  } catch (error) {
    res.send(error.message);
  }
};

export const getComments = async (req, res) => {
  try {

    const { postId } = req.params;

    const comments = await Comment.find({ postId })
      .populate("userId", "name username profilePicture")
      .sort({ createdAt: -1 });

    return res.json({
      comments
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};


export const deleteComment = async (req, res) => {
  try {
    const userId = req.session.userId;
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) return res.send("Comment not found");

    if (comment.userId.toString() !== userId) {
      return res.send("You can delete only your comment");
    }

    await comment.deleteOne();

    res.redirect("back");

  } catch (error) {
    res.send(error.message);
  }
};


export const deletePost = async (req, res) => {
  try {

    const userId = req.session.userId;
    const { postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
      return res.send("Post not found");
    }

    // 🔐 SECURITY CHECK
    if (!post.userId || post.userId.toString() !== userId) {
      return res.send("You can only delete your own post");
    }

    // ✅ DELETE FROM CLOUDINARY
    if (post.media) {

      const publicId = post.media
        .split("/")
        .pop()
        .split(".")[0];

      // 🔥 HANDLE IMAGE + VIDEO
      if (post.fileType && post.fileType.startsWith("video")) {
        await cloudinary.uploader.destroy(
          "proconnect_posts/" + publicId,
          { resource_type: "video" }
        );
      } else {
        await cloudinary.uploader.destroy(
          "proconnect_posts/" + publicId
        );
      }

    }

    // ✅ DELETE COMMENTS
    await Comment.deleteMany({ postId });

    // ✅ DELETE POST
    await Post.findByIdAndDelete(postId);

    // ✅ REDIRECT
    res.redirect("/profile/" + userId);

  } catch (error) {
    res.send(error.message);
  }
};


export const getMyPosts = async (req, res) => {
  try {

    const userId = req.session.userId;

    const posts = await Post.find({
      userId,
      active: true
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      posts
    });

  } catch (error) {

    return res.status(500).json({
      message: error.message
    });

  }
};


export const getEditPage = async (req, res) => {
  try {

   const post = await Post.findById(req.params.postId)
  .populate("userId", "username profilePicture name");

    if (!post) {
      return res.send("Post not found");
    }

    res.render("posts/edit", { post });

  } catch (err) {
    res.send(err.message);
  }
};




export const updatePost = async (req, res) => {
  try {

    const userId = req.session.userId;
    const { postId } = req.params;
    const { body } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res.send("Post not found");
    }

    // 🔐 SECURITY CHECK
    if (post.userId.toString() !== userId) {
      return res.send("You can only edit your own post");
    }

    // ✅ UPDATE TEXT
    if (body) {
      post.body = body;
    }

    // ✅ UPDATE MEDIA (IMAGE / VIDEO)
    if (req.file) {
      post.media = req.file.path;          // Cloudinary URL ✅
      post.fileType = req.file.mimetype;   // image/jpeg OR video/mp4
    }

    // ✅ UPDATED TIME
    post.updatedAt = new Date();

    await post.save();

    // 🔥 BETTER REDIRECT (IMPORTANT CHANGE)
    res.redirect("/profile/" + userId);

  } catch (error) {
    res.send(error.message);
  }
};