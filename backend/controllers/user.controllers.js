import Profile from "../models/profile.model.js";
import User from "../models/user.model.js";
import ConnectionRequest from "../models/connections.model.js";
import bcrypt from "bcrypt";
import PDFDocument from "pdfkit";
import crypto from "crypto";

export const register = async (req, res) => {
  try {
    const { name, userName, username, email, password, accountType } = req.body;

    const finalUsername = userName || username || null;

    // Validate required fields
    if (!name || !finalUsername || !email || !password) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    // Validate account type
    if (!["user", "recruiter"].includes(accountType)) {
      return res.status(400).json({
        message: "Please select a valid account type",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = new User({
      name,
      userName: finalUsername,
      email,
      password: hashedPassword,
      accountType,
      token: crypto.randomBytes(32).toString("hex"),
    });

    await newUser.save();

    // Create profile linked to user
    const profile = new Profile({
      userId: newUser._id,
    });

    await profile.save();

    return res.status(201).json({
      message: "User registered successfully",
      token: newUser.token,
      user: {
        _id: newUser._id,
        username: newUser.userName,
        name: newUser.name,
        email: newUser.email,
        accountType: newUser.accountType,
        profilePicture: newUser.profilePicture,
      },
    });
  } catch (error) {
    console.error("Register error:", error);

    return res.status(500).json({
      message: "Error registering user",
    });
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
        accountType: user.accountType,
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
    const { token, userId } = req.query;

    const requestingUser = await User.findOne({ token });

    if (!requestingUser) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const user = userId ? await User.findById(userId) : requestingUser;

    if (!user) {
      return res.status(404).json({
        message: "Profile user not found",
      });
    }

    const profile = await Profile.findOne({
      userId: user._id,
    });

    return res.status(200).json({
      message: "User fetched successfully",
      isOwnProfile: requestingUser._id.equals(user._id),

      user: {
        _id: user._id,
        name: user.name,
        username: user.userName,
        email: user.email,
        profilePicture: user.profilePicture,

        // ⭐ Important for Job Seeker / Recruiter
        accountType: user.accountType,
      },

      profile,
    });
  } catch (error) {
    console.error("getUserAndProfile error:", error);

    return res.status(500).json({
      message: "Error fetching user and profile",
    });
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

const normalizePreferenceList = (values) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values.map((value) => String(value).trim()).filter(Boolean);
};

export const getJobPreferences = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.accountType !== "user") {
      return res
        .status(403)
        .json({ message: "Only job seekers can access job preferences" });
    }

    const profile = await Profile.findOne({ userId: user._id });

    return res.json({
      preferences: profile?.jobPreferences || {
        preferredRoles: [],
        preferredLocations: [],
        skills: [],
        workMode: "",
        expectedSalary: "",
      },
    });
  } catch (error) {
    console.error("getJobPreferences error:", error);
    return res.status(500).json({ message: "Error fetching job preferences" });
  }
};

export const updateJobPreferences = async (req, res) => {
  const { token, jobPreferences = {} } = req.body;
  const validWorkModes = ["", "On-site", "Hybrid", "Remote"];

  try {
    const user = await User.findOne({ token });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.accountType !== "user") {
      return res
        .status(403)
        .json({ message: "Only job seekers can update job preferences" });
    }

    if (!validWorkModes.includes(jobPreferences.workMode || "")) {
      return res.status(400).json({ message: "Invalid work mode" });
    }

    const preferences = {
      preferredRoles: normalizePreferenceList(jobPreferences.preferredRoles),
      preferredLocations: normalizePreferenceList(
        jobPreferences.preferredLocations,
      ),
      skills: normalizePreferenceList(jobPreferences.skills),
      workMode: jobPreferences.workMode || "",
      expectedSalary: String(jobPreferences.expectedSalary || "").trim(),
    };

    let profile = await Profile.findOne({ userId: user._id });

    if (!profile) {
      profile = new Profile({ userId: user._id, jobPreferences: preferences });
    } else {
      profile.jobPreferences = preferences;
    }

    await profile.save();

    return res.json({
      message: "Job preferences saved successfully",
      preferences: profile.jobPreferences,
    });
  } catch (error) {
    console.error("updateJobPreferences error:", error);
    return res.status(500).json({ message: "Error saving job preferences" });
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
  try {
    const user = await User.findOne({ token: req.query.token });
    if (!user) {
      return res.status(401).json({ message: "Please log in first" });
    }

    const profile = await Profile.findOne({ userId: user._id });
    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${user.userName || "connectpro"}-resume.pdf"`,
    );
    doc.pipe(res);

    doc.fontSize(24).text(user.name || "ConnectPro Member");
    doc
      .fontSize(11)
      .fillColor("#555")
      .text(user.email || "");
    doc.moveDown();

    const addSection = (title, content) => {
      if (!content) return;
      doc.fillColor("#111").fontSize(15).text(title);
      doc.fontSize(11).fillColor("#333").text(content);
      doc.moveDown();
    };

    addSection("Headline", profile.headline);
    addSection("Location", profile.location);
    addSection("About", profile.bio);
    addSection("Skills", profile.skills?.join(", "));

    if (profile.education?.length) {
      addSection(
        "Education",
        profile.education
          .map(
            (item) =>
              `${item.school} - ${item.degree} in ${item.fieldOfStudy}${
                item.grade ? ` (${item.grade})` : ""
              }`,
          )
          .join("\n"),
      );
    }

    if (profile.experience?.length) {
      addSection(
        "Experience",
        profile.experience
          .map(
            (item) =>
              `${item.position} at ${item.company}${
                item.location ? ` - ${item.location}` : ""
              }\n${item.description || ""}`,
          )
          .join("\n\n"),
      );
    }

    addSection(
      "Links",
      [profile.github, profile.linkedin, profile.website]
        .filter(Boolean)
        .join("\n"),
    );

    doc.end();
  } catch (error) {
    console.error("downloadResume error:", error);
    return res.status(500).json({ message: "Error generating resume" });
  }
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
