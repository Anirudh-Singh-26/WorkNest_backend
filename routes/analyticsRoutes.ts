import express from "express";
import {protect} from "../middleware/authMiddleware";

import { getProjectAnalytics } from "../controllers/analyticsController";

const router = express.Router();

router.use(protect);

router.get("/project/:projectId", getProjectAnalytics);

export default router;
