import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { createServer } from "http";
import { Server } from "socket.io";
import postRoutes from "./routes/posts.routes.js";
import userRoutes from "./routes/user.routes.js";
import messageRoutes from "./routes/message.routes.js";
import jobRoutes from "./routes/job.routes.js";
import applicationRoutes from "./routes/application.routes.js";
import { registerMessageSocket } from "./socket/message.socket.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
  res.send("✅ Welcome! Your server is running on localhost:5000");
});

// Mount routes directly
app.use("/posts", postRoutes); // e.g. GET http://localhost:5000/posts
app.use("/users", userRoutes); // e.g. POST http://localhost:5000/users/register
app.use("/messages", messageRoutes); // e.g. POST http://localhost:5000/messages/send
app.use("/jobs", jobRoutes); // e.g. POST http://localhost:5000/jobs/create
app.use("/applications", applicationRoutes);

// Support some common incorrect paths to avoid 'connection refused' by mistake
// Redirect malformed or misspelled registration requests to the correct route
app.all("/user/resister", (req, res) => {
  return res.redirect(307, "/users/register");
});

app.all("/user/get_all_users", (req, res) => {
  return res.redirect(307, "/users/user/get_all_users");
});

// Serve uploaded files at /uploads path
app.use("/uploads", express.static("uploads"));

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    const DEFAULT_PORT = process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : 5000;

    const startListening = (port) => {
      const httpServer = createServer(app);
      const io = new Server(httpServer, {
        cors: {
          origin: true,
          credentials: true,
        },
      });

      registerMessageSocket(io);

      httpServer.listen(port, () => {
        console.log(`🚀 Server is running on port ${port}`);
      });

      httpServer.on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.warn(`⚠️ Port ${port} in use, trying port ${port + 1}`);
          startListening(port + 1);
          return;
        }
        console.error("❌ Server error:", err);
        process.exit(1);
      });
    };

    startListening(DEFAULT_PORT);
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
  }
};

startServer();
