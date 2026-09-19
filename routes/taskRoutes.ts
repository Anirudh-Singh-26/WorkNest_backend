import { Router } from "express";

import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  moveTask,
  bulkUpdateTasks,
  getCalendarTasks,
  archiveTask,
  getTimelineTasks,
  getArchivedTasks,
  restoreTask,
  deleteTask,
} from "../controllers/taskController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.post("/project/:projectId", createTask);

router.get("/project/:projectId", getTasks);

router.get("/project/:projectId/calendar", getCalendarTasks);

router.get("/project/:projectId/timeline", getTimelineTasks);

router.get("/project/:projectId/archived", getArchivedTasks);

router.patch("/bulk", bulkUpdateTasks);

router.get("/:taskId", getTask);

router.patch("/:taskId", updateTask);

router.patch("/:taskId/move", moveTask);

router.patch("/:taskId/archive", archiveTask);

router.patch("/:taskId/restore", restoreTask);

router.delete("/:taskId", deleteTask);

export default router;
