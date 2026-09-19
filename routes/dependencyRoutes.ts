import express from "express";
import {protect} from "../middleware/authMiddleware";

import {
  addDependency,
  removeDependency,
} from "../controllers/dependencyController";

const router = express.Router();

router.use(protect);

router.post("/:taskId", addDependency);

router.delete("/:taskId/:dependencyId", removeDependency);

export default router;
