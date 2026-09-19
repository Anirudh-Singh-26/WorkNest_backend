import { Router } from "express";

import {
  getAttachments,
  createAttachment,
  deleteAttachment,
} from "../controllers/attachmentController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.get("/task/:taskId", protect, getAttachments);

router.post("/task/:taskId", protect, createAttachment);

router.delete("/:attachmentId", protect, deleteAttachment);

export default router;
