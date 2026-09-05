import { Router } from "express";
import {
  applyForJob,
  checkApplicationStatus,
  getJobApplicants,
  getMyApplications,
  updateApplicationStatus,
} from "../controllers/application.controllers.js";

const router = Router();

router.route("/apply").post(applyForJob);
router.route("/my").get(getMyApplications);
router.route("/check/:jobId").get(checkApplicationStatus);
router.route("/recruiter/:jobId").get(getJobApplicants);
router.route("/:applicationId/status").patch(updateApplicationStatus);

export default router;
