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

export const getProjectAnalytics = async (
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

    const access = await getWorkspaceMember(
      project.workspace.toString(),
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
      filter.createdAt = {
        $gte: new Date(start as string),
        $lte: new Date(end as string),
      };
    }

    const totalTasks = await Task.countDocuments(filter);

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "COMPLETED",
    });

    const blockedTasks = await Task.countDocuments({
      ...filter,
      status: "BLOCKED",
    });

    const overdueTasks = await Task.countDocuments({
      ...filter,
      dueDate: {
        $lt: new Date(),
      },
      status: {
        $ne: "COMPLETED",
      },
    });

    const statusBreakdown = await Task.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    const priorityBreakdown = await Task.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: "$priority",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    const workload = await Task.aggregate([
      {
        $match: {
          ...filter,
          assignee: {
            $exists: true,
            $ne: null,
          },
        },
      },
      {
        $group: {
          _id: "$assignee",
          taskCount: {
            $sum: 1,
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $unwind: "$user",
      },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$user.name",
          email: "$user.email",
          taskCount: 1,
        },
      },
      {
        $sort: {
          taskCount: -1,
        },
      },
    ]);

    const createdByDate = await Task.aggregate([
      {
        $match: filter,
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const completedByDate = await Task.aggregate([
      {
        $match: {
          ...filter,
          completedAt: {
            $exists: true,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$completedAt",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const completionPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return res.status(200).json({
      success: true,
      data: {
        summary: {
          totalTasks,
          completedTasks,
          blockedTasks,
          overdueTasks,
          completionPercentage,
        },

        statusBreakdown,

        priorityBreakdown,

        workload,

        createdByDate,
        completedByDate,
      },
    });
  } catch (error) {
    next(error);
  }
};
