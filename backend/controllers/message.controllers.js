import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ConnectionRequest from "../models/connections.model.js";
import { createMessage } from "../services/message.service.js";

// ==========================================
// SEND MESSAGE
// ==========================================

export const sendMessage = async (req, res) => {
  const { token, receiverId, content } = req.body;

  try {
    const sender = await User.findOne({ token }).select("_id");
    if (!sender) {
      return res.status(404).json({ message: "Sender not found" });
    }

    const message = await createMessage({
      senderId: sender._id,
      receiverId,
      content,
    });

    return res.status(201).json({
      message: "Message sent successfully",
      data: message,
    });
  } catch (error) {
    console.error("Send message error:", error.message);
    return res.status(error.statusCode || 500).json({ message: error.message });
  }
};

// ==========================================
// GET CONNECTED USERS
// ==========================================

export const getConnectedUsers = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      token,
    }).select("_id");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const connections = await ConnectionRequest.find({
      $or: [
        {
          userId: user._id,
          status: "accepted",
        },
        {
          connectionId: user._id,
          status: "accepted",
        },
      ],
    })
      .populate("userId", "name userName email profilePicture")
      .populate("connectionId", "name userName email profilePicture");

    const connectedUsers = connections.map((connection) => {
      const connectedUser =
        connection.userId._id.toString() === user._id.toString()
          ? connection.connectionId
          : connection.userId;

      return connectedUser;
    });

    return res.json({
      connectedUsers,
    });
  } catch (error) {
    console.error("Get connected users error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ==========================================
// GET CONVERSATION
// ==========================================

export const getConversation = async (req, res) => {
  const { token, userId } = req.query;

  try {
    const sender = await User.findOne({ token }).select("_id");
    if (!sender) {
      return res.status(404).json({ message: "User not found" });
    }

    const connection = await ConnectionRequest.findOne({
      $or: [
        { userId: sender._id, connectionId: userId, status: "accepted" },
        { userId, connectionId: sender._id, status: "accepted" },
      ],
    });

    if (!connection) {
      return res.status(403).json({ message: "Users not connected" });
    }

    const messages = await Message.find({
      $or: [
        { senderId: sender._id, receiverId: userId },
        { senderId: userId, receiverId: sender._id },
      ],
    })
      .populate("senderId", "name userName profilePicture")
      .populate("receiverId", "name userName profilePicture")
      .sort({ createdAt: 1 });

    await Message.updateMany(
      { senderId: userId, receiverId: sender._id, read: false },
      { $set: { read: true } },
    );

    return res.json({ messages });
  } catch (error) {
    console.error("Get conversation error:", error.message);
    return res.status(500).json({ message: error.message });
  }
};

// ==========================================
// GET ALL CONVERSATIONS
// ==========================================

export const getConversations = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({
      token,
    }).select("_id");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Get all messages involving current user
    const messages = await Message.find({
      $or: [
        {
          senderId: user._id,
        },
        {
          receiverId: user._id,
        },
      ],
    })
      .populate("senderId", "name userName email profilePicture")
      .populate("receiverId", "name userName email profilePicture")
      .sort({
        createdAt: -1,
      });

    const conversationMap = new Map();

    messages.forEach((msg) => {
      const isSender = msg.senderId._id.toString() === user._id.toString();

      const partner = isSender ? msg.receiverId : msg.senderId;

      const partnerId = partner._id.toString();

      // First/latest message for this conversation
      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          user: partner,

          lastMessage: msg.content,

          lastMessageTime: msg.createdAt,

          // Only count unread messages
          // received from the other person
          unreadCount: !isSender && !msg.read ? 1 : 0,
        });
      } else {
        const conversation = conversationMap.get(partnerId);

        // Count unread messages received
        if (!isSender && !msg.read) {
          conversation.unreadCount += 1;
        }
      }
    });

    const conversations = Array.from(conversationMap.values());

    // Number of chats that contain
    // at least one unread message
    const unreadChats = conversations.filter(
      (conversation) => conversation.unreadCount > 0,
    ).length;

    // Total unread messages
    const totalUnreadMessages = conversations.reduce(
      (total, conversation) => total + conversation.unreadCount,
      0,
    );

    return res.json({
      conversations,

      unreadChats,

      totalUnreadMessages,
    });
  } catch (error) {
    console.error("Get conversations error:", error.message);

    return res.status(500).json({
      message: error.message,
    });
  }
};
