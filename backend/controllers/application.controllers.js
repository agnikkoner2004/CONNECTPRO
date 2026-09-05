import mongoose from "mongoose";
import Application from "../models/application.model.js";
import Job from "../models/job.model.js";
import User from "../models/user.model.js";

export const applyForJob = async (req, res) => {
  const { token, jobId } = req.body;

  try {
    const user = token ? await User.findOne({ token }) : null;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.accountType !== "user") {
      return res
        .status(403)
        .json({ message: "Only job seekers can apply for jobs" });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).select("recruiterId");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const existingApplication = await Application.findOne({
      jobId: job._id,
      applicantId: user._id,
    });

    if (existingApplication) {
      return res
        .status(409)
        .json({ message: "You have already applied for this job" });
    }

    const application = new Application({
      jobId: job._id,
      applicantId: user._id,
      recruiterId: job.recruiterId,
      status: "pending",
    });

    await application.save();

    return res.status(201).json({
      message: "Application submitted successfully",
      application,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(409)
        .json({ message: "You have already applied for this job" });
    }

    return res.status(500).json({ message: err.message });
  }
};

export const getMyApplications = async (req, res) => {
  const { token } = req.query;

  try {
    const user = token ? await User.findOne({ token }) : null;

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.accountType !== "user") {
      return res
        .status(403)
        .json({ message: "Only job seekers can access applications" });
    }

    const applications = await Application.find({ applicantId: user._id })
      .populate("jobId", "title company location workMode salary skills")
      .populate("recruiterId", "name userName profilePicture")
      .sort({ appliedAt: -1 });

    return res.json({ applications });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const checkApplicationStatus = async (req, res) => {
  const { token } = req.query;
  const { jobId } = req.params;

  try {
    const user = token ? await User.findOne({ token }) : null;

    if (!user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (user.accountType !== "user") {
      return res
        .status(403)
        .json({ message: "Only job seekers can check applications" });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const application = await Application.exists({
      jobId,
      applicantId: user._id,
    });

    return res.json({ applied: Boolean(application) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const getJobApplicants = async (req, res) => {
  const { token } = req.query;
  const { jobId } = req.params;

  try {
    const recruiter = token ? await User.findOne({ token }) : null;

    if (!recruiter) {
      return res.status(404).json({ message: "User not found" });
    }

    if (recruiter.accountType !== "recruiter") {
      return res
        .status(403)
        .json({ message: "Only recruiters can access applicants" });
    }

    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ message: "Invalid job ID" });
    }

    const job = await Job.findById(jobId).select("recruiterId");

    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.recruiterId.toString() !== recruiter._id.toString()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const applications = await Application.find({ jobId: job._id })
      .populate("applicantId", "name userName email profilePicture")
      .sort({ appliedAt: -1 });

    return res.json({ applications });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

export const updateApplicationStatus = async (req, res) => {
  const { token, status } = req.body;
  const { applicationId } = req.params;
  const validStatuses = ["Applied", "Accepted", "Rejected"];

  try {
    const recruiter = token ? await User.findOne({ token }) : null;

    if (!recruiter) {
      return res.status(404).json({ message: "User not found" });
    }

    if (recruiter.accountType !== "recruiter") {
      return res
        .status(403)
        .json({ message: "Only recruiters can update applications" });
    }

    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({ message: "Invalid application ID" });
    }

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid application status" });
    }

    const application = await Application.findById(applicationId);

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    const ownedJob = await Job.findOne({
      _id: application.jobId,
      recruiterId: recruiter._id,
    });

    if (!ownedJob) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    application.status = status;
    await application.save();
    await application.populate(
      "applicantId",
      "name userName email profilePicture",
    );

    return res.json({
      message: "Application status updated successfully",
      application,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};
