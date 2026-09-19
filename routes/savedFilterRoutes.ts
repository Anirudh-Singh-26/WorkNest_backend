import express from "express";
import { protect } from "../middleware/authMiddleware";

import {
  createSavedFilter,
  getSavedFilters,
  updateSavedFilter,
  deleteSavedFilter,
} from "../controllers/savedFilterController";

const router = express.Router();

router.use(protect);

router.post("/project/:projectId", createSavedFilter);
router.get("/project/:projectId", getSavedFilters);
router.patch("/:filterId", updateSavedFilter);
router.delete("/:filterId", deleteSavedFilter);

export default router;
