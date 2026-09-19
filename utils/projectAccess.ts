import Project from "../models/Project";
import Workspace from "../models/Workspace";

type ProjectAccessResult = {
  project: any;
  workspace: any;
  workspaceRole: string;
  isProjectMember: boolean;
};

export const getProjectAccess = async (
  projectId: string,
  userId: string,
): Promise<ProjectAccessResult | null> => {
  const project = await Project.findById(projectId);

  if (!project) {
    return null;
  }

  const workspace = await Workspace.findOne({
    _id: project.workspace,
    "members.user": userId,
  });

  if (!workspace) {
    return null;
  }

  const workspaceMember = workspace.members.find(
    (member) => member.user.toString() === userId,
  );

  if (!workspaceMember) {
    return null;
  }

  const isProjectMember = project.members.some(
    (member) => member.toString() === userId,
  );

  const privilegedRoles = ["OWNER", "ADMIN", "MANAGER"];

  if (!privilegedRoles.includes(workspaceMember.role) && !isProjectMember) {
    return null;
  }

  return {
    project,
    workspace,
    workspaceRole: workspaceMember.role,
    isProjectMember,
  };
};

export const canAccessProject = (access: ProjectAccessResult): boolean => {
  const privilegedRoles = ["OWNER", "ADMIN", "MANAGER"];

  if (privilegedRoles.includes(access.workspaceRole)) {
    return true;
  }

  return access.isProjectMember;
};
