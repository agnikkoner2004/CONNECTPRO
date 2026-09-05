import { Router } from "express";
import {
  createJob,
  getAllJobs,
  getJobById,
  getRecruiterJobs,
  deleteJob,
} from "../controllers/job.controllers.js";

const router = Router();

router.route("/create").post(createJob);
router.route("/").get(getAllJobs);
router.route("/recruiter").get(getRecruiterJobs);
router.route("/:id").get(getJobById).delete(deleteJob);

export default router;
