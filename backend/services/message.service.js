import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import ConnectionRequest from "../models/connections.model.js";

export const createMessage = async ({ senderId, receiverId, content }) => {
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  if (!normalizedContent) {
    const error = new Error("Message content is required");
    error.statusCode = 400;
    throw error;
  }

  const receiver = await User.findById(receiverId).select("_id");
  if (!receiver) {
    const error = new Error("Receiver not found");
    error.statusCode = 404;
    throw error;
  }

  const connection = await ConnectionRequest.findOne({
    $or: [
      { userId: senderId, connectionId: receiverId, status: "accepted" },
      { userId: receiverId, connectionId: senderId, status: "accepted" },
    ],
  });

  if (!connection) {
    const error = new Error("You can only message connected users");
    error.statusCode = 403;
    throw error;
  }

  const message = await Message.create({
    senderId,
    receiverId,
    content: normalizedContent,
  });

  await message.populate([
    { path: "senderId", select: "name userName profilePicture" },
    { path: "receiverId", select: "name userName profilePicture" },
  ]);

  return message;
};
