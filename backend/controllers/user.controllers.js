import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";
import ConnectionRequest from "../models/connections.model.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import PDFDocument from "pdfkit";
import fs from "fs";

const convertUserDataToPDF = async (userData) => {
  const doc = new PDFDocument();

  const outputPath = crypto.randomBytes(32).toString("hex") + ".pdf";
  const stream = fs.createWriteStream("uploads/" + outputPath);
  doc.pipe(stream);
  doc.image("uploads/${userData.profilePicture}", {
    fit: [100, 100],
    align: "center",
    valign: "center",
  });
  doc.fontSize(14).text("Name: ${userData.userId.name}");
  doc.fontSize(14).text("Username: ${userData.userId.userName}");
  doc.fontSize(14).text("Email: ${userData.userId.email}");
  doc.fontSize(14).text("Bio: ${userData.bio}");
  doc.fontSize(14).text("Current Position: ${userData.currentPosition}");

  doc.fontSize(14).text("Experience:");
  userData.experience.forEach((exp, index) => {
    doc.fontSize(14).text("Company Name: ${exp.companyName}");
    doc.fontSize(14).text("Role: ${exp.role}");
    doc.fontSize(14).text("Duration: ${exp.years}");
  });
  doc.end();

  return outputPath;
};

export const register = async (req, res) => {
  try {
    // Accept either `userName` (existing backend) or `username` (frontend)
    const { name, userName, username, email, password } = req.body;
    const finalUsername = userName || username || null;

    // Validate required fields
    if (!name || !finalUsername || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      userName: finalUsername, // store under schema field
      email,
      password: hashedPassword,
    });
    await newUser.save();

    // Create profile linked to user
    const profile = new Profile({ userId: newUser._id });
    await profile.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: newUser._id,
        username: newUser.userName,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error registering user" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    await User.updateOne({ _id: user._id }, { token });

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        username: user.userName,
        name: user.name,
        email: user.email,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error logging in" });
  }
};

export const uploadprofilepicture = async (req, res) => {
  const token = req.body?.token || req.query?.token;

  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    user.profilePicture = req.file.filename;
    await user.save();

    res.status(200).json({ message: "Profile picture updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating profile picture" });
  }
};
export const updateUserProfile = async (req, res) => {
  try {
    const { token, name, email } = req.body;

    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!name?.trim() || !email?.trim()) {
      return res.status(400).json({ message: "Name and email are required" });
    }

    const existingUser = await User.findOne({
      email: email.trim(),
    });

    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      return res.status(400).json({ message: "Email already in use" });
    }

    user.name = name.trim();
    user.email = email.trim();
    await user.save();
    return res
      .status(200)
      .json({ message: "User profile updated successfully" });
  } catch (error) {
    console.error("updateUserProfile error:", error);
    return res.status(500).json({ message: "Error updating user profile" });
  }
};

export const updatePassword = async (req, res) => {
  try {
    const { token, currentPassword, newPassword } = req.body;
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "New password must be at least 6 characters" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("updatePassword error:", error);
    return res.status(500).json({ message: "Error updating password" });
  }
};

export const getUserAndProfile = async (req, res) => {
  try {
    const { token } = req.query; // since you're using POST
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const profile = await Profile.findOne({ userId: user._id });

    res.status(200).json({
      message: "User fetched successfully",
      user: {
        _id: user._id,
        name: user.name,
        username: user.userName,
        email: user.email,
        profilePicture: user.profilePicture,
      },
      profile,
    });
  } catch (error) {
    console.error("getUserAndProfile error:", error); // <-- log the real error
    res.status(500).json({ message: "Error fetching user and profile" });
  }
};

export const updateProfileData = async (req, res) => {
  try {
    const { token, ...profileData } = req.body;

    // Find user by token
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Find profile by userId
    let profile = await Profile.findOne({ userId: user._id });

    // If no profile exists, create a new one
    if (!profile) {
      profile = new Profile({ userId: user._id, ...profileData });
    } else {
      Object.assign(profile, profileData); // update existing
    }

    await profile.save();

    res.status(200).json({
      message: "Profile data updated successfully",
      profile,
    });
  } catch (error) {
    console.error("updateProfileData error:", error);
    res.status(500).json({ message: "Error updating profile data" });
  }
};

export const getAllUserProfile = async (req, res) => {
  try {
    const profiles = await Profile.find().populate(
      "userId",
      "userName email profilePicture",
    );
    return res.json({ profiles });
  } catch (error) {
    return res.status(500).json({ message: error.massege });
  }
};

export const downloadResume = async (req, res) => {
  const userId = req.query.userId; // Assuming userId is passed as a query parameter

  const userProfile = await Profile.findOne({ userId }).populate(
    "userId",
    "userName email profilePicture",
  );

  let outputPath = await convertUserProfileToPDF(userProfile);

  return res.json({
    message: "Resume generated successfully",
    resumePath: outputPath,
  });
};

export const sendConnectionRequest = async (req, res) => {
  const { token, connectionId } = req.body;

  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const connectionUser = await User.findById(connectionId);
    if (!connectionUser) {
      return res.status(400).json({ message: "Connection user not found" });
    }
    if (user._id.equals(connectionUser._id)) {
      return res
        .status(400)
        .json({ message: "You cannot connect with yourself" });
    }

    const existingRequest = await ConnectionRequest.findOne({
      $or: [
        { userId: user._id, connectionId: connectionUser._id },
        { userId: connectionUser._id, connectionId: user._id },
      ],
      status: { $in: ["pending", "accepted"] },
    });

    if (existingRequest) {
      return res
        .status(400)
        .json({ message: "Connection request already sent" });
    }

    const request = new ConnectionRequest({
      userId: user._id,
      connectionId: connectionUser._id,
    });
    await request.save();

    return res.json({ message: "Request Sent" });
  } catch (error) {
    res.status(500).json({ message: "Error sending connection request" });
  }
};

export const getMyConnectionsRequests = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const requests = await ConnectionRequest.find({
      connectionId: user._id,
      status: "pending",
    }).populate("userId", "name userName email profilePicture");

    return res.json({ requests });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const whatAreMyConnections = async (req, res) => {
  const { token } = req.query;
  try {
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const connections = await ConnectionRequest.find({
      $or: [{ userId: user._id }, { connectionId: user._id }],
      status: "accepted",
    })
      .populate("userId", "name userName email profilePicture")
      .populate("connectionId", "name userName email profilePicture");
    return res.json({ connections, userId: user._id });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const acceptConnectionRequest = async (req, res) => {
  const { token, requestId, action_type } = req.body;
  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(404).json({ messege: " User not found" });
    }
    const connection = await ConnectionRequest.findOne({
      _id: requestId,
      connectionId: user._id,
      status: "pending",
    });
    if (!connection) {
      return res.status(404).json({ messege: "Connection not found" });
    }
    if (action_type === "accept") {
      connection.status = "accepted";
    } else {
      connection.status = "rejected";
    }
    await connection.save();
    return res.json({ messege: "Request Updated" });
  } catch (err) {
    return res.status(500).json({ message: err.messege });
  }
};

export const getConnectionSuggestions = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await User.findOne({ token });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const existingRequests = await ConnectionRequest.find({
      $or: [{ userId: user._id }, { connectionId: user._id }],
    }).select("userId connectionId");
    const excludedIds = new Set([user._id.toString()]);
    existingRequests.forEach((request) => {
      excludedIds.add(request.userId.toString());
      excludedIds.add(request.connectionId.toString());
    });

    const users = await User.find({
      _id: { $nin: [...excludedIds] },
    }).select("name userName email profilePicture");
    const profiles = await Profile.find({
      userId: { $in: users.map((candidate) => candidate._id) },
    }).lean();
    const profileByUserId = new Map(
      profiles.map((profile) => [profile.userId.toString(), profile]),
    );
    const suggestions = users.map((candidate) => ({
      ...(profileByUserId.get(candidate._id.toString()) || {}),
      userId: candidate,
    }));

    return res.json({ profiles: suggestions });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
