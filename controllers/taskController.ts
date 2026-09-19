import { Request, Response, NextFunction } from "express";
import Task from "../models/Task";
import Project from "../models/Project";
import ActivityLog from "../models/ActivityLog";
import Notification from "../models/Notification";
import User from "../models/User";
import { getProjectAccess } from "../utils/projectAccess";

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const {
      title,
      description,
      assignee,
      status,
      priority,
      startDate,
      dueDate,
      labels,
      estimate,
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Task title is required",
      });
    }

    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be before the start date",
      });
    }

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    if (
      assignee &&
      !project.members.some((member) => member.toString() === assignee)
    ) {
      return res.status(400).json({
        success: false,
        message: "Assignee must be a project member",
      });
    }

    if (assignee) {
      const assigneeExists = await User.exists({
        _id: assignee,
      });

      if (!assigneeExists) {
        return res.status(404).json({
          success: false,
          message: "Assignee not found",
        });
      }
    }

    const lastTask = await Task.findOne({
      project: project._id,
      status: status || "TODO",
      archivedAt: { $exists: false },
    }).sort({ order: -1 });

    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      project: project._id,
      title,
      description,
      assignee,
      reporter: user._id,
      status: status || "TODO",
      priority: priority || "MEDIUM",
      startDate,
      dueDate,
      labels: labels || [],
      estimate,
      order,
    });

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.created", populatedTask);

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const {
      search,
      status,
      priority,
      assignee,
      label,
      overdue,
      creator,
      startDate,
      dueDate,
      sortBy = "createdAt",
      sortOrder = "desc",
      page = "1",
      limit = "100",
    } = req.query;

    const filter: any = {
      project: project._id,
      archivedAt: { $exists: false },
    };

    if (search) {
      filter.$or = [
        {
          title: {
            $regex: search,
            $options: "i",
          },
        },
        {
          description: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (assignee) {
      filter.assignee = assignee;
    }

    if (label) {
      filter.labels = label;
    }

    if (creator) {
      filter.reporter = creator;
    }

     if (startDate) {
      filter.startDate = {
        $gte: new Date(startDate as string),
      };
    }

    if (dueDate) {
      filter.dueDate = {
        ...(filter.dueDate || {}),
        $lte: new Date(dueDate as string),
      };
    }

    if (overdue === "true") {
      filter.dueDate = {
        $lt: new Date(),
      };

      filter.status = {
        $ne: "COMPLETED",
      };
    }

    const pageNumber = Math.max(Number(page), 1);
    const limitNumber = Math.min(Math.max(Number(limit), 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const allowedSortFields = [
      "createdAt",
      "updatedAt",
      "dueDate",
      "startDate",
      "priority",
      "status",
      "order",
      "title",
    ];

    const sortField = allowedSortFields.includes(sortBy as string)
      ? (sortBy as string)
      : "createdAt";

    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("dependencies", "title status priority startDate dueDate")
      .sort({
        [sortField]: sortDirection,
      })
      .skip(skip)
      .limit(limitNumber);

    const totalTasks = await Task.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total: totalTasks,
          totalPages: Math.ceil(totalTasks / limitNumber),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getCalendarTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        success: false,
        message: "start and end dates are required",
      });
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    const tasks = await Task.find({
      project: project._id,
      archivedAt: { $exists: false },

      $or: [
        {
          startDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          dueDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          startDate: { $lte: startDate },
          dueDate: { $gte: endDate },
        },
      ],
    })
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .sort({ startDate: 1, dueDate: 1 });

    return res.status(200).json({
      success: true,
      data: {
        tasks,
        range: {
          start: startDate,
          end: endDate,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const task = await Task.findById(req.params.taskId)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("project", "name workspace")
      .populate("dependencies", "title status priority startDate dueDate");

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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        task,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    if (req.body.version === undefined) {
      return res.status(400).json({
        success: false,
        message: "Task version is required for updates",
      });
    }

    const clientVersion = Number(req.body.version);

    if (Number.isNaN(clientVersion)) {
      return res.status(400).json({
        success: false,
        message: "Task version must be a valid number",
      });
    }

    if (clientVersion !== task.version) {
      return res.status(409).json({
        success: false,
        message: "Task was updated by another user",
        currentTask: task,
      });
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assignee",
      "startDate",
      "dueDate",
      "labels",
      "estimate",
    ];

    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    const newStartDate =
      updateData.startDate !== undefined
        ? updateData.startDate
        : task.startDate;

    const newDueDate =
      updateData.dueDate !== undefined ? updateData.dueDate : task.dueDate;

    if (
      newStartDate &&
      newDueDate &&
      new Date(newDueDate) < new Date(newStartDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Due date cannot be before the start date",
      });
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
    }

    if (updateData.assignee !== undefined && updateData.assignee !== null) {
      const isProjectMember = project.members.some(
        (member) => member.toString() === updateData.assignee,
      );

      if (!isProjectMember) {
        return res.status(400).json({
          success: false,
          message: "Assignee must be a project member",
        });
      }

      const assigneeExists = await User.exists({
        _id: updateData.assignee,
      });

      if (!assigneeExists) {
        return res.status(404).json({
          success: false,
          message: "Assignee not found",
        });
      }
    }

    const oldTask = {
      title: task.title,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      dueDate: task.dueDate,
    };

    const taskUpdateData: any = {
      ...updateData,
    };

    const updateOperation: any = {
      $set: taskUpdateData,
      $inc: {
        version: 1,
      },
    };

    if (taskUpdateData.status === "COMPLETED" && task.status !== "COMPLETED") {
      taskUpdateData.completedAt = new Date();
    }

    if (taskUpdateData.status && taskUpdateData.status !== "COMPLETED") {
      delete taskUpdateData.completedAt;
      updateOperation.$unset = {
        completedAt: 1,
      };
    }

    const updatedTask = await Task.findOneAndUpdate(
      {
        _id: task._id,
        version: clientVersion,
      },
      updateOperation,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedTask) {
      return res.status(409).json({
        success: false,
        message: "Task was updated by another user",
      });
    }

    const populatedTask = await Task.findById(updatedTask._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .populate("dependencies", "title status priority startDate dueDate");

    if (!populatedTask) {
      return res.status(404).json({
        success: false,
        message: "Task update failed",
      });
    }

    await ActivityLog.create({
      actor: user._id,
      entityType: "Task",
      entityId: task._id,
      action: "TASK_UPDATED",
      before: oldTask,
      after: {
        title: populatedTask.title,
        status: populatedTask.status,
        priority: populatedTask.priority,
        assignee: populatedTask.assignee,
        dueDate: populatedTask.dueDate,
      },
    });

    const io = req.app.get("io");

    if (
      updateData.assignee &&
      updateData.assignee !== oldTask.assignee?.toString()
    ) {
      const notification = await Notification.create({
        recipient: updateData.assignee,
        actor: user._id,
        type: "ASSIGNMENT",
        message: `You were assigned to task "${populatedTask.title}"`,
        entityType: "Task",
        entityId: task._id,
      });

      io.to(`user:${updateData.assignee}`).emit(
        "notification.created",
        notification,
      );
    }

    io.to(`workspace:${project.workspace}`).emit("task.updated", populatedTask);

    return res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const { status, order, version } = req.body;

    if (!status || order === undefined) {
      return res.status(400).json({
        success: false,
        message: "Status and order are required",
      });
    }
    if (version === undefined) {
      return res.status(400).json({
        success: false,
        message: "Task version is required for moving a task",
      });
    }

    const clientVersion = Number(version);

    if (Number.isNaN(clientVersion)) {
      return res.status(400).json({
        success: false,
        message: "Task version must be a valid number",
      });
    }

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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    if (clientVersion !== task.version) {
      return res.status(409).json({
        success: false,
        message: "Task was updated by another user",
        currentTask: task,
      });
    }

    const oldStatus = task.status;

    const oldColumnTasks = await Task.find({
      project: project._id,
      status: oldStatus,
      archivedAt: { $exists: false },
      _id: { $ne: task._id },
    }).sort({ order: 1 });

    let newColumnTasks = oldColumnTasks;

    if (status !== oldStatus) {
      newColumnTasks = await Task.find({
        project: project._id,
        status,
        archivedAt: { $exists: false },
      }).sort({ order: 1 });
    }

    const newOrder = Math.max(
      0,
      Math.min(Number(order), newColumnTasks.length),
    );

    if (status !== oldStatus) {
      newColumnTasks.splice(newOrder, 0, task);

      for (let i = 0; i < oldColumnTasks.length; i++) {
        oldColumnTasks[i].order = i;
        await oldColumnTasks[i].save();
      }

      for (let i = 0; i < newColumnTasks.length; i++) {
        newColumnTasks[i].status = status;
        newColumnTasks[i].order = i;
        await newColumnTasks[i].save();
      }

      task.status = status;
      task.order = newOrder;
      task.version += 1;
      await task.save();
    } else {
      oldColumnTasks.splice(newOrder, 0, task);

      for (let i = 0; i < oldColumnTasks.length; i++) {
        oldColumnTasks[i].order = i;
        await oldColumnTasks[i].save();
      }

      task.status = status;
      task.order = newOrder;
      task.version += 1;
      await task.save();
    }

    const updatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.moved", updatedTask);

    return res.status(200).json({
      success: true,
      message: "Task moved successfully",
      data: {
        task: updatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getTimelineTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const { start, end } = req.query;

    const filter: any = {
      project: project._id,
      archivedAt: { $exists: false },
    };

    if (start && end) {
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);

      filter.$or = [
        {
          startDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          dueDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          startDate: { $lte: startDate },
          dueDate: { $gte: endDate },
        },
      ];
    }

    const tasks = await Task.find(filter)
      .populate("assignee", "name email")
      .populate("dependencies", "title status priority startDate dueDate")
      .sort({ startDate: 1 });

    return res.status(200).json({
      success: true,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const bulkUpdateTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const { tasks: requestedTasks, updates } = req.body;

    if (!Array.isArray(requestedTasks) || requestedTasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: "tasks must be a non-empty array",
      });
    }

    if (!updates || typeof updates !== "object") {
      return res.status(400).json({
        success: false,
        message: "updates are required",
      });
    }

    const allowedFields = [
      "title",
      "description",
      "status",
      "priority",
      "assignee",
      "startDate",
      "dueDate",
      "labels",
      "estimate",
    ];

    const updateData: any = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        updateData[field] = updates[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
    }

    const successful: any[] = [];
    const failed: any[] = [];

    for (const requestedTask of requestedTasks) {
      const taskId = requestedTask?.id;
      const clientVersion = Number(requestedTask?.version);

      try {
        if (!taskId || Number.isNaN(clientVersion)) {
          failed.push({
            taskId,
            success: false,
            message: "Valid task id and version are required",
          });
          continue;
        }

        const task = await Task.findById(taskId);

        if (!task) {
          failed.push({
            taskId,
            success: false,
            message: "Task not found",
          });
          continue;
        }

        const project = await Project.findById(task.project);

        if (!project) {
          failed.push({
            taskId,
            success: false,
            message: "Project not found",
          });
          continue;
        }

        const access = await getProjectAccess(
          project._id.toString(),
          user._id.toString(),
        );

        if (!access) {
          failed.push({
            taskId,
            success: false,
            message: "You do not have access to this task",
          });
          continue;
        }

        if (clientVersion !== task.version) {
          failed.push({
            taskId,
            success: false,
            message: "Task was updated by another user",
            currentVersion: task.version,
          });
          continue;
        }

        if (updateData.assignee !== undefined && updateData.assignee !== null) {
          const isProjectMember = project.members.some(
            (member) => member.toString() === updateData.assignee,
          );

          if (!isProjectMember) {
            failed.push({
              taskId,
              success: false,
              message: "Assignee must be a project member",
            });
            continue;
          }

          const assigneeExists = await User.exists({
            _id: updateData.assignee,
          });

          if (!assigneeExists) {
            failed.push({
              taskId,
              success: false,
              message: "Assignee not found",
            });
            continue;
          }
        }

        const oldTask = {
          title: task.title,
          status: task.status,
          priority: task.priority,
          assignee: task.assignee,
          dueDate: task.dueDate,
        };

        const taskUpdateData: any = {
          ...updateData,
        };

        const updateOperation: any = {
          $set: taskUpdateData,
          $inc: {
            version: 1,
          },
        };

        if (
          taskUpdateData.status === "COMPLETED" &&
          task.status !== "COMPLETED"
        ) {
          taskUpdateData.completedAt = new Date();
        }

        if (taskUpdateData.status && taskUpdateData.status !== "COMPLETED") {
          delete taskUpdateData.completedAt;
          updateOperation.$unset = {
            completedAt: 1,
          };
        }

        const updatedTask = await Task.findOneAndUpdate(
          {
            _id: task._id,
            version: clientVersion,
          },
          updateOperation,
          {
            new: true,
            runValidators: true,
          },
        );

        if (!updatedTask) {
          failed.push({
            taskId,
            success: false,
            message: "Task was updated by another user",
          });
          continue;
        }

        const populatedTask = await Task.findById(updatedTask._id)
          .populate("assignee", "name email")
          .populate("reporter", "name email");

        await ActivityLog.create({
          actor: user._id,
          entityType: "Task",
          entityId: task._id,
          action: "TASK_BULK_UPDATED",
          before: oldTask,
          after: {
            title: populatedTask?.title,
            status: populatedTask?.status,
            priority: populatedTask?.priority,
            assignee: populatedTask?.assignee,
            dueDate: populatedTask?.dueDate,
          },
        });

        successful.push({
          taskId,
          success: true,
          task: populatedTask,
        });

        const io = req.app.get("io");

        io.to(`workspace:${project.workspace}`).emit(
          "task.updated",
          populatedTask,
        );

        if (
          updateData.assignee &&
          updateData.assignee !== oldTask.assignee?.toString()
        ) {
          const notification = await Notification.create({
            recipient: updateData.assignee,
            actor: user._id,
            type: "ASSIGNMENT",
            message: `You were assigned to task "${populatedTask?.title}"`,
            entityType: "Task",
            entityId: task._id,
          });

          io.to(`user:${updateData.assignee}`).emit(
            "notification.created",
            notification,
          );
        }
      } catch (error) {
        failed.push({
          taskId,
          success: false,
          message: "Failed to update task",
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk operation completed",
      data: {
        successful,
        failed,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveTask = async (
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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    if (!["OWNER", "ADMIN", "MANAGER"].includes(access.workspaceRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to archive tasks",
      });
    }

    task.archivedAt = new Date();
    task.version += 1;

    await task.save();

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.archived", {
      taskId: task._id,
    });

    return res.status(200).json({
      success: true,
      message: "Task archived successfully",
      data: {
        task: {
          _id: task._id,
          archivedAt: task.archivedAt,
          version: task.version,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    if (!["OWNER", "ADMIN", "MANAGER"].includes(access.workspaceRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to delete tasks",
      });
    }

    await Task.findByIdAndDelete(task._id);

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit("task.deleted", {
      taskId: task._id.toString(),
      projectId: project._id.toString(),
    });

    return res.status(200).json({
      success: true,
      message: "Task deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getArchivedTasks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const project = await Project.findById(req.params.projectId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this project",
      });
    }

    const tasks = await Task.find({
      project: project._id,
      archivedAt: { $exists: true },
    })
      .populate("assignee", "name email")
      .populate("reporter", "name email")
      .sort({ archivedAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        tasks,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const restoreTask = async (
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

    const access = await getProjectAccess(
      project._id.toString(),
      user._id.toString(),
    );

    if (!access) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this task",
      });
    }

    if (!["OWNER", "ADMIN", "MANAGER"].includes(access.workspaceRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to restore tasks",
      });
    }

    task.archivedAt = undefined;
    task.version += 1;

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit(
      "task.restored",
      populatedTask,
    );

    return res.status(200).json({
      success: true,
      message: "Task restored successfully",
      data: {
        task: populatedTask,
      },
    });
  } catch (error) {
    next(error);
  }
};
