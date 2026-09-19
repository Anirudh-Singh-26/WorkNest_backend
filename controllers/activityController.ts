import { Request, Response, NextFunction } from "express";
import ActivityLog from "../models/ActivityLog";
import Task from "../models/Task";
import Project from "../models/Project";
import Workspace from "../models/Workspace";

export const getTaskActivity = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const project = await Project.findById(task.project);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const workspace = await Workspace.findOne({
      _id: project.workspace,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const activities = await ActivityLog.find({
      entityType: "Task",
      entityId: task._id,
    })
      .populate("actor", "name email")
      .sort({ createdAt: -1 })
      .limit(100);

    return res.status(200).json({
      success: true,
      data: {
        activities,
      },
    });
  } catch (error) {
    next(error);
  }
};
