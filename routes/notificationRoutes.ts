import { Router } from "express";

import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from "../controllers/notificationController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.get("/", getNotifications);

router.patch("/:notificationId/read", markAsRead);

router.patch("/read-all", markAllAsRead);

export default router;
