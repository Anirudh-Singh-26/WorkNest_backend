import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "./models/User";
import Workspace from "./models/Workspace";
import Project from "./models/Project";
import Task from "./models/Task";
import Comment from "./models/Comment";
import Notification from "./models/Notification";
import SavedFilter from "./models/SavedFilter";
import ActivityLog from "./models/ActivityLog";
import Attachment from "./models/Attachment";

const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(12, 0, 0, 0);
  return date;
};

const seed = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is required");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    await Promise.all([
      ActivityLog.deleteMany({}),
      Attachment.deleteMany({}),
      Comment.deleteMany({}),
      Notification.deleteMany({}),
      SavedFilter.deleteMany({}),
      Task.deleteMany({}),
      Project.deleteMany({}),
      Workspace.deleteMany({}),
      User.deleteMany({}),
    ]);

    const passwordHash = await bcrypt.hash("Demo@123", 12);

    const [owner, admin, manager, member, viewer] = await User.create([
      {
        name: "Fixl Owner",
        email: "owner@fixl.demo",
        passwordHash,
        role: "OWNER",
      },
      {
        name: "Fixl Admin",
        email: "admin@fixl.demo",
        passwordHash,
        role: "ADMIN",
      },
      {
        name: "Fixl Manager",
        email: "manager@fixl.demo",
        passwordHash,
        role: "MANAGER",
      },
      {
        name: "Fixl Member",
        email: "member@fixl.demo",
        passwordHash,
        role: "MEMBER",
      },
      {
        name: "Fixl Viewer",
        email: "viewer@fixl.demo",
        passwordHash,
        role: "VIEWER",
      },
    ]);

    const workspace = await Workspace.create({
      name: "Fixl Demo Workspace",
      owner: owner._id,
      members: [
        { user: owner._id, role: "OWNER" },
        { user: admin._id, role: "ADMIN" },
        { user: manager._id, role: "MANAGER" },
        { user: member._id, role: "MEMBER" },
        { user: viewer._id, role: "VIEWER" },
      ],
    });

    const project = await Project.create({
      workspace: workspace._id,
      owner: owner._id,
      name: "Fixl Product Development",
      description: "Demo project for the collaborative task management platform.",
      startDate: daysFromNow(-14),
      endDate: daysFromNow(45),
      status: "IN_PROGRESS",
      members: [
        owner._id,
        admin._id,
        manager._id,
        member._id,
        viewer._id,
      ],
    });

    const [completedTask, activeTask, reviewTask, blockedTask, upcomingTask] =
      await Task.create([
        {
          project: project._id,
          title: "Set up authentication",
          description: "Registration, login, refresh and logout flow.",
          reporter: owner._id,
          assignee: admin._id,
          status: "COMPLETED",
          priority: "HIGH",
          startDate: daysFromNow(-12),
          dueDate: daysFromNow(-7),
          completedAt: daysFromNow(-8),
          labels: ["backend", "security"],
          estimate: 8,
          order: 0,
        },
        {
          project: project._id,
          title: "Build project dashboard",
          description: "Implement workspace, project and task dashboard.",
          reporter: owner._id,
          assignee: manager._id,
          status: "IN_PROGRESS",
          priority: "HIGH",
          startDate: daysFromNow(-3),
          dueDate: daysFromNow(5),
          labels: ["frontend"],
          estimate: 12,
          order: 0,
        },
        {
          project: project._id,
          title: "Review realtime collaboration",
          description: "Verify task and comment synchronization.",
          reporter: manager._id,
          assignee: member._id,
          status: "IN_REVIEW",
          priority: "MEDIUM",
          startDate: daysFromNow(0),
          dueDate: daysFromNow(8),
          labels: ["realtime"],
          estimate: 6,
          order: 0,
        },
        {
          project: project._id,
          title: "Resolve dependency flow",
          description: "Verify dependency visualization and conflicts.",
          reporter: owner._id,
          assignee: member._id,
          status: "BLOCKED",
          priority: "CRITICAL",
          startDate: daysFromNow(-1),
          dueDate: daysFromNow(3),
          labels: ["dependencies"],
          estimate: 5,
          order: 0,
        },
        {
          project: project._id,
          title: "Prepare submission documentation",
          description: "README, schema, API and WebSocket documentation.",
          reporter: owner._id,
          assignee: viewer._id,
          status: "TODO",
          priority: "LOW",
          startDate: daysFromNow(6),
          dueDate: daysFromNow(14),
          labels: ["documentation"],
          estimate: 4,
          order: 0,
        },
      ]);

    activeTask.dependencies = [completedTask._id];
    reviewTask.dependencies = [activeTask._id];
    await Promise.all([activeTask.save(), reviewTask.save()]);

    await Comment.create([
      {
        task: activeTask._id,
        author: manager._id,
        body: "Dashboard work is in progress.",
      },
      {
        task: reviewTask._id,
        author: member._id,
        body: "Realtime flow is ready for review.",
      },
    ]);

    await Notification.create([
      {
        recipient: member._id,
        actor: manager._id,
        type: "ASSIGNMENT",
        message: 'You were assigned to "Review realtime collaboration".',
        entityType: "Task",
        entityId: reviewTask._id,
      },
      {
        recipient: owner._id,
        actor: manager._id,
        type: "STATUS_CHANGE",
        message: '"Build project dashboard" is now in progress.',
        entityType: "Task",
        entityId: activeTask._id,
      },
    ]);

    await SavedFilter.create({
      user: owner._id,
      project: project._id,
      name: "High Priority Open Tasks",
      filters: {
        priority: "HIGH",
        status: "IN_PROGRESS",
      },
      isDefault: true,
    });

    await ActivityLog.create([
      {
        actor: owner._id,
        entityType: "Project",
        entityId: project._id,
        action: "PROJECT_CREATED",
        after: {
          name: project.name,
          status: project.status,
        },
      },
      {
        actor: manager._id,
        entityType: "Task",
        entityId: activeTask._id,
        action: "TASK_UPDATED",
        before: {
          status: "TODO",
        },
        after: {
          status: "IN_PROGRESS",
        },
      },
    ]);

    await Attachment.create({
      task: activeTask._id,
      uploadedBy: manager._id,
      fileName: "requirements.pdf",
      fileUrl: "https://example.com/demo/requirements.pdf",
      fileType: "application/pdf",
      fileSize: 102400,
    });

    console.log("");
    console.log("Fixl demo seed completed.");
    console.log("");
    console.log("Demo password: Demo@123");
    console.log("owner@fixl.demo");
    console.log("admin@fixl.demo");
    console.log("manager@fixl.demo");
    console.log("member@fixl.demo");
    console.log("viewer@fixl.demo");
    console.log("");
  } catch (error) {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seed();
