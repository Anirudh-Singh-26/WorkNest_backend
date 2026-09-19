import { Request, Response, NextFunction } from "express";
import SavedFilter from "../models/SavedFilter";
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

export const createSavedFilter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const { name, filters } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Filter name is required",
      });
    }

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

    const savedFilter = await SavedFilter.create({
      user: user._id,
      project: project._id,
      name,
      filters: filters || {},
    });

    return res.status(201).json({
      success: true,
      message: "Filter saved successfully",
      data: {
        filter: savedFilter,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getSavedFilters = async (
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

    const filters = await SavedFilter.find({
      user: user._id,
      project: project._id,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: {
        filters,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const deleteSavedFilter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const filter = await SavedFilter.findOne({
      _id: req.params.filterId,
      user: user._id,
    });

    if (!filter) {
      return res.status(404).json({
        success: false,
        message: "Saved filter not found",
      });
    }

    await filter.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Saved filter deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const updateSavedFilter = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = (req as any).user;

    const { name, filters, isDefault } = req.body;

    const savedFilter = await SavedFilter.findOne({
      _id: req.params.filterId,
      user: user._id,
    });

    if (!savedFilter) {
      return res.status(404).json({
        success: false,
        message: "Saved filter not found",
      });
    }

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          success: false,
          message: "Filter name cannot be empty",
        });
      }

      savedFilter.name = String(name).trim();
    }

    if (filters !== undefined) {
      savedFilter.filters = filters;
    }

    if (isDefault === true) {
      await SavedFilter.updateMany(
        {
          user: user._id,
          project: savedFilter.project,
          _id: { $ne: savedFilter._id },
        },
        {
          $set: { isDefault: false },
        },
      );

      savedFilter.isDefault = true;
    }

    if (isDefault === false) {
      savedFilter.isDefault = false;
    }

    await savedFilter.save();

    return res.status(200).json({
      success: true,
      message: "Saved filter updated successfully",
      data: {
        filter: savedFilter,
      },
    });
  } catch (error) {
    next(error);
  }
};
