import { Router } from "express";
import {
  createProject,
  getProjects,
  getProject,
  updateProject,
  archiveProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "../controllers/projectController";

import { protect } from "../middleware/authMiddleware";

const router = Router();

router.use(protect);

router.post("/workspace/:workspaceId", createProject);

router.get("/workspace/:workspaceId", getProjects);

router.get("/workspace/:workspaceId/:projectId", getProject);

router.patch("/workspace/:workspaceId/:projectId", updateProject);

router.patch("/workspace/:workspaceId/:projectId/archive", archiveProject);

router.get("/workspace/:workspaceId/:projectId/members", getProjectMembers);

router.post("/workspace/:workspaceId/:projectId/members", addProjectMember);

router.delete("/workspace/:workspaceId/:projectId/members/:userId", removeProjectMember);

export default router;
