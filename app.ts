import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes";
import workspaceRoutes from "./routes/workspaceRoutes";
import projectRoutes from "./routes/projectRoutes";
import taskRoutes from "./routes/taskRoutes";
import commentRoutes from "./routes/commentRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import activityRoutes from "./routes/activityRoutes";
import savedFilterRoutes from "./routes/savedFilterRoutes";
import { errorHandler } from "./middleware/errorMiddleware";
import dependencyRoutes from "./routes/dependencyRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import attachmentRoutes from "./routes/attachmentRoutes";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/saved-filters", savedFilterRoutes);
app.use("/api/dependencies", dependencyRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/attachments", attachmentRoutes);

app.use("/api/comments", commentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

app.use(errorHandler);

export default app;
