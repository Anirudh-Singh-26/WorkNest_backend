import { Router } from "express";

import { getTaskActivity } from "../controllers/activityController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.get("/task/:taskId", getTaskActivity);

export default router;
