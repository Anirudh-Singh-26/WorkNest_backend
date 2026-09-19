import { Router } from "express";

import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/commentController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.get("/task/:taskId", getComments);

router.post("/task/:taskId", createComment);

router.patch("/:commentId", updateComment);

router.delete("/:commentId", deleteComment);

export default router;
