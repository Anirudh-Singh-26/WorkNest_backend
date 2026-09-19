import { Request, Response, NextFunction } from "express";
import Task from "../models/Task";
import Project from "../models/Project";
import Workspace from "../models/Workspace";

const getWorkspaceMember = async (workspaceId: string, userId: string) => {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    "members.user": userId,
  });

  if (!workspace) {
    return null;
  }

  return workspace.members.find((member) => member.user.toString() === userId);
};

export const addDependency = async (
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

    const access = await getWorkspaceMember(
      project.workspace.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const canManageDependencies = ["OWNER", "ADMIN", "MANAGER"].includes(
      access.role,
    );

    if (!canManageDependencies) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage dependencies",
      });
    }

    const { dependencyId } = req.body;

    if (!dependencyId) {
      return res.status(400).json({
        success: false,
        message: "dependencyId is required",
      });
    }

    if (dependencyId === task._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "A task cannot depend on itself",
      });
    }

    const dependencyTask = await Task.findById(dependencyId);

    if (!dependencyTask) {
      return res.status(404).json({
        success: false,
        message: "Dependency task not found",
      });
    }

    if (dependencyTask.project.toString() !== project._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "Dependency must belong to the same project",
      });
    }

    if (task.dependencies?.some((id) => id.toString() === dependencyId)) {
      return res.status(400).json({
        success: false,
        message: "Dependency already exists",
      });
    }

    task.dependencies = task.dependencies || [];
    task.dependencies.push(dependencyId);
    task.version += 1;

    await task.save();

    const updatedTask = await Task.findById(task._id).populate(
      "dependencies",
      "title status priority",
    );

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.updated", updatedTask);

    return res.status(200).json({
      success: true,
      message: "Dependency added successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeDependency = async (
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

    const access = await getWorkspaceMember(
      project.workspace.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const canManageDependencies = ["OWNER", "ADMIN", "MANAGER"].includes(
      access.role,
    );

    if (!canManageDependencies) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to manage dependencies",
      });
    }

    const dependencyId = req.params.dependencyId;

    task.dependencies = (task.dependencies || []).filter(
      (id) => id.toString() !== dependencyId,
    );

    task.version += 1;

    await task.save();

    const updatedTask = await Task.findById(task._id).populate(
      "dependencies",
      "title status priority",
    );

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.updated", updatedTask);

    return res.status(200).json({
      success: true,
      message: "Dependency removed successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};
