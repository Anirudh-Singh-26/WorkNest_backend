import { Request, Response, NextFunction } from "express";
import Comment from "../models/Comment";
import Task from "../models/Task";
import Project from "../models/Project";
import Notification from "../models/Notification";
import ActivityLog from "../models/ActivityLog";
import { getProjectAccess, canAccessProject } from "../utils/projectAccess";

const getTaskAccess = async (taskId: string, userId: string) => {
  const task = await Task.findById(taskId);

  if (!task) {
    return null;
  }

  const project = await Project.findById(task.project);

  if (!project) {
    return null;
  }

  const access = await getProjectAccess(project._id.toString(), userId);

  if (!access || !canAccessProject(access)) {
    return null;
  }

  return {
    task,
    project,
    access,
  };
};

export const getComments = async (
  req: Request<{ taskId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const access = await getTaskAccess(req.params.taskId, user._id.toString());

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comments = await Comment.find({
      task: req.params.taskId,
    })
      .populate("author", "name email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        comments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createComment = async (
  req: Request<{ taskId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment body is required",
      });
    }

    const access = await getTaskAccess(req.params.taskId, user._id.toString());

    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const comment = await Comment.create({
      task: access.task._id,
      author: user._id,
      body: body.trim(),
    });

    await ActivityLog.create({
      actor: user._id,
      entityType: "Comment",
      entityId: comment._id,
      action: "COMMENT_CREATED",
      after: {
        taskId: access.task._id,
        body: comment.body,
      },
    });

    const populatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email",
    );

    const io = req.app.get("io");

    io.to(`workspace:${access.project.workspace}`).emit(
      "comment.created",
      populatedComment,
    );

    if (
      access.task.assignee &&
      access.task.assignee.toString() !== user._id.toString()
    ) {
      const notification = await Notification.create({
        recipient: access.task.assignee,
        actor: user._id,
        type: "COMMENT",
        message: `${user.name} commented on a task assigned to you`,
        entityType: "Task",
        entityId: access.task._id,
      });

      io.to(`user:${access.task.assignee}`).emit(
        "notification.created",
        notification,
      );
    }

    return res.status(201).json({
      success: true,
      message: "Comment created successfully",
      data: {
        comment: populatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateComment = async (
  req: Request<{ commentId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment body is required",
      });
    }

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own comments",
      });
    }

    const access = await getTaskAccess(
      comment.task.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this comment",
      });
    }

    const oldBody = comment.body;

    comment.body = body.trim();

    await comment.save();

    const task = await Task.findById(comment.task);
    const project = task ? await Project.findById(task.project) : null;

    await ActivityLog.create({
      actor: user._id,
      entityType: "Comment",
      entityId: comment._id,
      action: "COMMENT_UPDATED",
      before: {
        body: oldBody,
      },
      after: {
        body: comment.body,
      },
    });

    const updatedComment = await Comment.findById(comment._id).populate(
      "author",
      "name email",
    );

    const io = req.app.get("io");

    io.to(`workspace:${access.project.workspace}`).emit(
      "comment.updated",
      updatedComment,
    );

    return res.status(200).json({
      success: true,
      message: "Comment updated successfully",
      data: {
        comment: updatedComment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteComment = async (
  req: Request<{ commentId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const comment = await Comment.findById(req.params.commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: "Comment not found",
      });
    }

    if (comment.author.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    const access = await getTaskAccess(
      comment.task.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this comment",
      });
    }

    await comment.deleteOne();

    await ActivityLog.create({
      actor: user._id,
      entityType: "Comment",
      entityId: comment._id,
      action: "COMMENT_DELETED",
      before: {
        body: comment.body,
      },
    });

    const io = req.app.get("io");

    io.to(`workspace:${access.project.workspace}`).emit("comment.deleted", {
      commentId: comment._id,
      taskId: comment.task,
    });

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
