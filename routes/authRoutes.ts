import { Router } from "express";

import {
  register,
  login,
  logout,
  refreshToken,
  getMe,
} from "../controllers/authController";

import { protect } from "../middleware/authMiddleware";
import { authRateLimiter } from "../middleware/rateLimitMiddleware";

const router = Router();

router.post("/register", authRateLimiter, register);

router.post("/login", authRateLimiter, login);

router.post("/refresh", authRateLimiter, refreshToken);

router.post("/logout", protect, logout);

router.get("/me", protect, getMe);

export default router;
