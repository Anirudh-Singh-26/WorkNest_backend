import { Request, Response, NextFunction } from "express";
import Workspace from "../models/Workspace";
import User from "../models/User";
import Project from "../models/Project";
import Task from "../models/Task";

export const createWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { name } = req.body;
    const user = (req as any).user;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    const workspace = await Workspace.create({
      name,
      owner: user._id,
      members: [
        {
          user: user._id,
          role: "OWNER",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Workspace created successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspaces = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspaces = await Workspace.find({
      "members.user": user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        workspaces,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkspace = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      "members.user": user._id,
    })
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const { userId, email, role } = req.body;

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember = workspace.members.find(
      (member) => member.user.toString() === user._id.toString(),
    );

    if (!currentMember || !["OWNER", "ADMIN"].includes(currentMember.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add members",
      });
    }

    let memberUserId = userId;

    if (!memberUserId && email) {
      const memberUser = await User.findOne({
        email: email.toLowerCase(),
      });

      if (!memberUser) {
        return res.status(404).json({
          success: false,
          message: "User with this email was not found",
        });
      }

      memberUserId = memberUser._id.toString();
    }

    if (!memberUserId) {
      return res.status(400).json({
        success: false,
        message: "User ID or email is required",
      });
    }

    const alreadyMember = workspace.members.some(
      (member) => member.user.toString() === memberUserId.toString(),
    );

    if (alreadyMember) {
      return res.status(409).json({
        success: false,
        message: "User is already a workspace member",
      });
    }

    const allowedRoles = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace role",
      });
    }

    workspace.members.push({
      user: memberUserId,
      role,
      joinedAt: new Date(),
    });

    await workspace.save();

    return res.status(200).json({
      success: true,
      message: "Member added successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};









export const updateMemberRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const { role } = req.body;

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember = workspace.members.find(
      (member) => member.user.toString() === user._id.toString(),
    );

    if (!currentMember || currentMember.role !== "OWNER") {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can change roles",
      });
    }

    const member = workspace.members.find(
      (member) => member.user.toString() === req.params.userId,
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (member.role === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "Owner role cannot be changed",
      });
    }

    const allowedRoles = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid workspace role",
      });
    }

    member.role = role;

    await workspace.save();

    return res.status(200).json({
      success: true,
      message: "Member role updated successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeMember = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const userId = req.params.userId;

    const workspace = await Workspace.findOne({
      _id: req.params.id,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const currentMember = workspace.members.find(
      (member) => member.user.toString() === user._id.toString(),
    );

    if (!currentMember || !["OWNER", "ADMIN"].includes(currentMember.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove members",
      });
    }

    const memberToRemove = workspace.members.find(
      (member) => member.user.toString() === userId,
    );

    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: "Workspace member not found",
      });
    }

    if (memberToRemove.role === "OWNER") {
      return res.status(400).json({
        success: false,
        message: "Workspace owner cannot be removed",
      });
    }

    // Find all projects in this workspace
    const projects = await Project.find({
      workspace: workspace._id,
    }).select("_id");

    const projectIds = projects.map((project) => project._id);

    // Remove user from all project members
    await Project.updateMany(
      {
        workspace: workspace._id,
        members: userId.toString(),
      },
      {
        $pull: {
          members: userId.toString(),
        },
      },
    );

    // Remove user as assignee from all tasks in this workspace
    if (projectIds.length > 0) {
      await Task.updateMany(
        {
          project: { $in: projectIds },
          assignee: userId.toString(),
        },
        {
          $unset: {
            assignee: 1,
          },
        },
      );
    }

    // Remove user from workspace
    workspace.members = workspace.members.filter(
      (member) => member.user.toString() !== userId,
    );

    await workspace.save();

    // Notify connected clients
    const io = req.app.get("io");

    if (io) {
      io.to(`workspace:${workspace._id}`).emit("workspace.member.removed", {
        workspaceId: workspace._id.toString(),
        userId,
        projectIds: projectIds.map((id) => id.toString()),
      });
    }

    return res.status(200).json({
      success: true,
      message: "Member removed successfully",
      data: {
        workspace,
      },
    });
  } catch (error) {
    next(error);
  }
};
