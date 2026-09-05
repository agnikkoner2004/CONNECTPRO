import User from "../models/user.model.js";
import { createMessage } from "../services/message.service.js";

const connectedSockets = new Map();

const addSocket = (userId, socketId) => {
  const sockets = connectedSockets.get(userId) || new Set();
  sockets.add(socketId);
  connectedSockets.set(userId, sockets);
};

const removeSocket = (userId, socketId) => {
  const sockets = connectedSockets.get(userId);
  if (!sockets) return;

  sockets.delete(socketId);
  if (sockets.size === 0) {
    connectedSockets.delete(userId);
  }
};

export const registerMessageSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      const user = await User.findOne({ token }).select("_id");

      if (!user) {
        return next(new Error("Unauthorized socket"));
      }

      socket.userId = user._id.toString();
      return next();
    } catch (error) {
      return next(new Error("Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    addSocket(socket.userId, socket.id);

    socket.on("send_message", async (payload, acknowledge) => {
      try {
        const message = await createMessage({
          senderId: socket.userId,
          receiverId: payload?.receiverId,
          content: payload?.content,
        });
        const receiverId = message.receiverId._id.toString();
        const receiverSockets = connectedSockets.get(receiverId) || [];

        receiverSockets.forEach((socketId) => {
          io.to(socketId).emit("receive_message", message);
        });

        acknowledge?.({ ok: true, message });
      } catch (error) {
        acknowledge?.({
          ok: false,
          message: error.message || "Unable to send message",
        });
      }
    });

    socket.on("disconnect", () => {
      removeSocket(socket.userId, socket.id);
    });
  });
};
