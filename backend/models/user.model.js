import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },

  userName: {
    type: String,
    required: true,
    unique: true,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  accountType: {
    type: String,
    enum: ["user", "recruiter"],
    default: "user",
    required: true,
  },

  profilePicture: {
    type: String,
    default: "default-profile.jpg",
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  token: {
    type: String,
    default: "",
  },
});

const User = mongoose.model("User", userSchema);

export default User;
