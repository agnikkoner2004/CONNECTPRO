import mongoose from "mongoose";
import Job from "../models/job.model.js";
import User from "../models/user.model.js";

const getAuthenticatedUser = async (token) => {
  if (!token) {
    return null;
  }

  return User.findOne({ token });
};

const isRecruiter = (user) => user?.accountType === "recruiter";
const validWorkModes = ["On-site", "Hybrid", "Remote"];

export const createJob = async (req, res) => {
  const {
    token,
    title,
    company,
    description,
    location,
    workMode,
    skills,
    salary,
  } = req.body;

  try {
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isRecruiter(user)) {
      return res
        .status(403)
        .json({ message: "Only recruiters can create jobs" });
    }

    if (
      !title?.trim() ||
      !company?.trim() ||
      !description?.trim() ||
      !location?.trim() ||
      !validWorkModes.includes(workMode) ||
      !Array.isArray(skills) ||
      skills.length === 0
    ) {
      return res.status(400).json({
        message:
          "Title, company, description, location, work mode, and skills are required",
      });
    }

    const job = new Job({
      recruiterId: user._id,
      title: title.trim(),
      company: company.trim(),
      description: description.trim(),
      location: location.trim(),
      workMode,
      skills: skills.map((skill) => String(skill).trim()).filter(Boolean),
      salary: salary?.trim() || undefined,
    });

    if (job.skills.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one skill is required" });
    }

    await job.save();

    return res.status(201).json({
      message: "Job created successfully",
      job,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate("recruiterId", "name userName email profilePicture")
      .sort({ createdAt: -1 });

    return res.json({ jobs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getJobById = async (req, res) => {
  const jobId = req.params.id;

  try {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).populate(
      "recruiterId",
      "name userName email profilePicture",
    );

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    return res.json({ job });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getRecruiterJobs = async (req, res) => {
  const { token } = req.query;

  try {
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isRecruiter(user)) {
      return res
        .status(403)
        .json({ message: "Only recruiters can access recruiter jobs" });
    }

    const jobs = await Job.find({ recruiterId: user._id }).sort({
      createdAt: -1,
    });

    return res.json({ jobs });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const deleteJob = async (req, res) => {
  const { token, jobId: bodyJobId } = req.body;
  const jobId = req.params.id || bodyJobId;

  try {
    const user = await getAuthenticatedUser(token);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!isRecruiter(user)) {
      return res
        .status(403)
        .json({ message: "Only recruiters can delete jobs" });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.recruiterId.toString() !== user._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    await Job.deleteOne({ _id: jobId });
    return res.json({ message: "Job Deleted" });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
