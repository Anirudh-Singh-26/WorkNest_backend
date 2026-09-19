import { Request, Response, NextFunction } from "express";
import Attachment from "../models/Attachment";
import Task from "../models/Task";
import { getProjectAccess, canAccessProject } from "../utils/projectAccess";
import ActivityLog from "../models/ActivityLog";

export const getAttachments = async (
  req: Request<{ taskId: string }>,
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

    const access = await getProjectAccess(
      task.project.toString(),
      user._id.toString(),
    );

    if (!access || !canAccessProject(access)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    const attachments = await Attachment.find({
      task: task._id,
    })
      .populate("uploadedBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        attachments,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const createAttachment = async (
  req: Request<{ taskId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const { fileName, fileUrl, fileType, fileSize } = req.body;

    if (!fileName || !fileUrl || !fileType || fileSize === undefined) {
      return res.status(400).json({
        success: false,
        message: "fileName, fileUrl, fileType and fileSize are required",
      });
    }

    try {
      const url = new URL(fileUrl);

      if (!["http:", "https:"].includes(url.protocol)) {
        return res.status(400).json({
          success: false,
          message: "Invalid attachment URL",
        });
      }
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid attachment URL",
      });
    }

    if (typeof fileSize !== "number" || fileSize <= 0) {
      return res.status(400).json({
        success: false,
        message: "fileSize must be a positive number",
      });
    }

    const MAX_FILE_SIZE = 10 * 1024 * 1024;

    if (fileSize > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "File size cannot exceed 10 MB",
      });
    }

    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const access = await getProjectAccess(
      task.project.toString(),
      user._id.toString(),
    );

    if (!access || !canAccessProject(access)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add attachments",
      });
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
      "text/plain",
    ];

    if (!allowedTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: "Unsupported file type",
      });
    }

    const attachment = await Attachment.create({
      task: task._id,
      uploadedBy: user._id,
      fileName: fileName.trim(),
      fileUrl: fileUrl.trim(),
      fileType: fileType.trim(),
      fileSize,
    });

    await ActivityLog.create({
      actor: user._id,
      entityType: "Attachment",
      entityId: attachment._id,
      action: "ATTACHMENT_CREATED",
      after: {
        taskId: task._id,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        fileSize: attachment.fileSize,
      },
    });

    const populatedAttachment = await Attachment.findById(
      attachment._id,
    ).populate("uploadedBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Attachment created successfully",
      data: {
        attachment: populatedAttachment,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttachment = async (
  req: Request<{ attachmentId: string }>,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const attachment = await Attachment.findById(req.params.attachmentId);

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: "Attachment not found",
      });
    }

    const task = await Task.findById(attachment.task);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found",
      });
    }

    const access = await getProjectAccess(
      task.project.toString(),
      user._id.toString(),
    );

    if (!access || !canAccessProject(access)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this attachment",
      });
    }
    const isUploader = attachment.uploadedBy.toString() === user._id.toString();

    const privilegedRoles = ["OWNER", "ADMIN", "MANAGER"];

    if (!isUploader && !privilegedRoles.includes(access.workspaceRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete this attachment",
      });
    }

    await attachment.deleteOne();

    await ActivityLog.create({
      actor: user._id,
      entityType: "Attachment",
      entityId: attachment._id,
      action: "ATTACHMENT_DELETED",
      before: {
        taskId: task._id,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
