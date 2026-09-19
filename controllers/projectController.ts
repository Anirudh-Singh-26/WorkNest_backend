import { Request, Response, NextFunction } from "express";
import Project from "../models/Project";
import Workspace from "../models/Workspace";

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;
    const { name, description, startDate, endDate } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Project name is required",
      });
    }

    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (item) => item.user.toString() === user._id.toString(),
    );

    if (!member || !["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to create projects",
      });
    }

    const project = await Project.create({
      workspace: workspace._id,
      owner: user._id,
      name,
      description,
      startDate,
      endDate,
      members: [user._id],
    });

    return res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};
const getWorkspaceMember = async (workspaceId: string, userId: string) => {
  const workspace = await Workspace.findOne({
    _id: workspaceId,
    "members.user": userId,
  });

  if (!workspace) {
    return null;
  }

  const member = workspace.members.find(
    (item) => item.user.toString() === userId,
  );

  return {
    workspace,
    member,
  };
};

export const getProjects = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const projects = await Project.find({
      workspace: workspace._id,
      status: { $ne: "ARCHIVED" },
      $or: [{ owner: user._id }, { members: user._id }],
    })
      .populate("owner", "name email")
      .populate("members", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        projects,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const project = await Project.findOne({
      _id: req.params.projectId,
      workspace: workspace._id,
      status: { $ne: "ARCHIVED" },
      $or: [{ owner: user._id }, { members: user._id }],
    })
      .populate("owner", "name email")
      .populate("members", "name email");

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found or you do not have access to it",
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (item) => item.user.toString() === user._id.toString(),
    );

    if (!member || !["OWNER", "ADMIN", "MANAGER"].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to update projects",
      });
    }

    const allowedFields = [
      "name",
      "description",
      "startDate",
      "endDate",
      "status",
    ];

    const updateData: any = {};

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid update fields provided",
      });
    }

    if (
      updateData.startDate &&
      updateData.endDate &&
      new Date(updateData.startDate) > new Date(updateData.endDate)
    ) {
      return res.status(400).json({
        success: false,
        message: "Start date cannot be after end date",
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        workspace: workspace._id,
      },
      updateData,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    const io = req.app.get("io");

    io.to(`workspace:${workspace._id}`).emit("project.updated", project);

    return res.status(200).json({
      success: true,
      message: "Project updated successfully",
      data: {
        project,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const archiveProject = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const workspace = await Workspace.findOne({
      _id: req.params.workspaceId,
      "members.user": user._id,
    });

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const member = workspace.members.find(
      (item) => item.user.toString() === user._id.toString(),
    );

    if (!member || !["OWNER", "ADMIN"].includes(member.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to archive projects",
      });
    }

    const project = await Project.findOneAndUpdate(
      {
        _id: req.params.projectId,
        workspace: workspace._id,
      },
      {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
      {
        new: true,
      },
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Project archived successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectMembers = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const project = await Project.findById(req.params.projectId).populate(
      "members",
      "name email",
    );

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

    return res.status(200).json({
      success: true,
      data: {
        members: project.members,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const addProjectMember = async (
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

    if (
      !access.member ||
      !["OWNER", "ADMIN", "MANAGER"].includes(access.member.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to add project members",
      });
    }

    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }



     if (userId === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot add yourself to the project",
      });
    }

    const workspaceMember = await Workspace.findOne({
      _id: project.workspace,
      "members.user": userId,
    });

    if (!workspaceMember) {
      return res.status(400).json({
        success: false,
        message: "User must be a workspace member",
      });
    }

    const alreadyMember = project.members.some(
      (member) => member.toString() === userId,
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "User is already a project member",
      });
    }

    project.members.push(userId);
    await project.save();

    const updatedProject = await Project.findById(project._id).populate(
      "members",
      "name email",
    );

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit(
      "project.updated",
      updatedProject,
    );

    return res.status(200).json({
      success: true,
      message: "Project member added successfully",
      data: {
        project: updatedProject,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const removeProjectMember = async (
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

    if (
      !access.member ||
      !["OWNER", "ADMIN", "MANAGER"].includes(access.member.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to remove project members",
      });
    }

    const memberId = req.params.userId;

    if (memberId === user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot remove yourself from the project",
      });
    }

    const isMember = project.members.some(
      (member) => member.toString() === memberId,
    );

    if (!isMember) {
      return res.status(404).json({
        success: false,
        message: "Project member not found",
      });
    }

    project.members = project.members.filter(
      (member) => member.toString() !== memberId,
    );

    await project.save();

    const updatedProject = await Project.findById(project._id).populate(
      "members",
      "name email",
    );

    const io = req.app.get("io");

    io.to(`workspace:${project.workspace}`).emit(
      "project.updated",
      updatedProject,
    );


    return res.status(200).json({
      success: true,
      message: "Project member removed successfully",
      data: {
        project: updatedProject,
      },
    });
  } catch (error) {
    next(error);
  }
};