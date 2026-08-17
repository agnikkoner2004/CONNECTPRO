import User from "../models/user.model.js";
import Post from "../models/posts.model.js";
import Comment from "../models/comments.model.js";
import ConnectionRequest from "../models/connections.model.js";

// Simple health check controller
export const activeCheck = (req, res) => {
  res.json({ status: "✅ API is active and working!" });
};

export const createPost = async (req, res) => {
  const { token, body } = req.body;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const newPost = new Post({
      userId: user._id,
      body,
      media: req.file ? req.file.filename : "",
      fileType: req.file ? req.file.mimetype.split("/")[0] : "",
    });

    await newPost.save();
    return res.status(200).json({ message: "Post created" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("userId", "name userName email profilePicture")
      .sort({ createdAt: -1 });

    return res.json({ posts });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deletePost = async (req, res) => {
  const { token, post_id } = req.body;
  try {
    const user = await User.findOne({ token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findOne({ _id: post_id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (post.userId.toString() !== user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Post.deleteOne({ _id: post_id });
    return res.json({ message: "Post Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const commentPost = async (req, res) => {
  const { token, post_id, commentBody } = req.body;

  try {
    const user = await User.findOne({ token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findOne({ _id: post_id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = new Comment({
      userId: user._id,
      postId: post._id,
      body: commentBody,
    });

    await comment.save();
    return res.status(200).json({ message: "Comment Added" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const get_comments_by_post = async (req, res) => {
  const { post_id } = req.query;
  try {
    const post = await Post.findOne({ _id: post_id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comments = await Comment.find({ postId: post._id })
      .populate("userId", "name userName profilePicture")
      .sort({ _id: 1 });

    return res.json({ comments });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const delete_comment_of_user = async (req, res) => {
  const { token, comment_id } = req.body;
  try {
    const user = await User.findOne({ token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const comment = await Comment.findOne({ _id: comment_id });
    if (!comment) {
      return res.status(404).json({ message: "Comment not found" });
    }

    if (comment.userId.toString() !== user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Comment.deleteOne({ _id: comment_id });
    return res.json({ message: "Comment Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const increment_likes = async (req, res) => {
  const { token, post_id } = req.body;
  try {
    const user = await User.findOne({ token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findOne({ _id: post_id });
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Ensure likes is an array
    if (!Array.isArray(post.likes)) {
      post.likes = [];
    }

    // Check if user already liked this post
    const hasLiked = post.likes.some(
      (likeUserId) => likeUserId.toString() === user._id.toString(),
    );

    if (hasLiked) {
      // Remove like (toggle off)
      post.likes = post.likes.filter(
        (likeUserId) => likeUserId.toString() !== user._id.toString(),
      );
    } else {
      // Add like (toggle on)
      post.likes.push(user._id);
    }

    await post.save();

    // Refetch and populate the post
    const updatedPost = await Post.findById(post_id).populate(
      "userId",
      "name userName email profilePicture",
    );

    console.log(
      "Like toggled for post:",
      post_id,
      "hasLiked was:",
      hasLiked,
      "new likes:",
      updatedPost.likes,
    );
    return res.json({
      message: hasLiked ? "Like removed" : "Like added",
      post: updatedPost,
    });
  } catch (err) {
    console.error("Like error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};

export const getFriendsPosts = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token }).select("_id");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all accepted connections for this user
    const connections = await ConnectionRequest.find({
      $or: [
        { userId: user._id, status: "accepted" },
        { connectionId: user._id, status: "accepted" },
      ],
    });

    // Extract friend IDs
    const friendIds = connections.map((conn) =>
      conn.userId.toString() === user._id.toString()
        ? conn.connectionId
        : conn.userId,
    );

    // Include user's own posts as well
    friendIds.push(user._id);

    // Get posts from friends and user, sorted by date
    const posts = await Post.find({ userId: { $in: friendIds } })
      .populate("userId", "name userName email profilePicture")
      .populate("likes")
      .sort({ createdAt: -1 });

    return res.json({ posts });
  } catch (err) {
    console.error("getFriendsPosts error:", err.message);
    return res.status(500).json({ message: err.message });
  }
};
