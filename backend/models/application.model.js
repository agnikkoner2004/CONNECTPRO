import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },

  applicantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  status: {
    type: String,
    enum: [
      "pending",
      "accepted",
      "rejected",
      "Applied",
      "Accepted",
      "Rejected",
    ],
    default: "pending",
    required: true,
  },

  appliedAt: {
    type: Date,
    default: Date.now,
  },
});

applicationSchema.index({ jobId: 1, applicantId: 1 }, { unique: true });

export default mongoose.models.Application ||
  mongoose.model("Application", applicationSchema);
