import { Router } from "express";

import {
  createWorkspace,
  getWorkspaces,
  getWorkspace,
  addMember,
  updateMemberRole,
  removeMember,
} from "../controllers/workspaceController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.post("/", createWorkspace);

router.get("/", getWorkspaces);

router.get("/:id", getWorkspace);

router.post("/:id/members", addMember);

router.patch("/:id/members/:userId", updateMemberRole);

router.delete("/:id/members/:userId", removeMember);

export default router;
