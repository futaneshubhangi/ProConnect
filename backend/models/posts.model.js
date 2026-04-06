import mongoose from "mongoose";

const PostSchema = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },

  body: {
    type: String,
    required: true
  },

  media: {
    type: String, // Cloudinary image URL
    default: ""
  },

  fileType: {
    type: String, // image / video
    default: ""
  },

  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  ],

  active: {
    type: Boolean,
    default: true
  }

}, { timestamps: true }); // automatically creates createdAt and updatedAt

const Post = mongoose.model("Post", PostSchema);

export default Post;