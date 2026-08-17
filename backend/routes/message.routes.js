import { Router } from "express";
import {
  sendMessage,
  getConnectedUsers,
  getConversation,
  getConversations,
} from "../controllers/message.controllers.js";

const router = Router();

// POST - Send a message
router.route("/send").post(sendMessage);

// GET - Get all connected users
router.route("/connected-users").get(getConnectedUsers);

// GET - Get conversation with a specific user
router.route("/conversation").get(getConversation);

// GET - Get all conversations
router.route("/conversations").get(getConversations);

export default router;
