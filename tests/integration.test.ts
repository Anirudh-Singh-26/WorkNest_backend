import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

import app from "../app";
import User from "../models/User";
import Workspace from "../models/Workspace";

let mongoServer: MongoMemoryServer;

const ownerAgent = request.agent(app);
const viewerAgent = request.agent(app);

let workspaceId = "";
let projectId = "";
let taskId = "";
let secondTaskId = "";
let taskVersion = 0;

const register = async (
  agent: ReturnType<typeof request.agent>,
  name: string,
  email: string,
) => {
  const response = await agent.post("/api/auth/register").send({
    name,
    email,
    password: "Test@123",
  });

  expect(response.status).toBe(201);
  return response.body.data.user;
};

beforeAll(async () => {
  process.env.FRONTEND_URL = "http://localhost:5173";
  process.env.JWT_ACCESS_SECRET = "test-access-secret";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret";

  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  app.set("io", {
    to: () => ({
      emit: () => undefined,
    }),
  });

  await register(ownerAgent, "Test Owner", "owner@test.local");
  await register(viewerAgent, "Test Viewer", "viewer@test.local");
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("Fixl API integration", () => {
  it("exposes a health endpoint", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("supports authenticated workspace and project creation", async () => {
    const workspaceResponse = await ownerAgent
      .post("/api/workspaces")
      .send({ name: "Test Workspace" });

    expect(workspaceResponse.status).toBe(201);

    workspaceId = workspaceResponse.body.data.workspace._id;

    const projectResponse = await ownerAgent
      .post(`/api/projects/workspace/${workspaceId}`)
      .send({
        name: "Test Project",
        description: "Integration test project",
      });

    expect(projectResponse.status).toBe(201);

    projectId = projectResponse.body.data.project._id;

    const viewer = await User.findOne({ email: "viewer@test.local" });
    const workspace = await Workspace.findById(workspaceId);

    workspace!.members.push({
      user: viewer!._id,
      role: "VIEWER",
      joinedAt: new Date(),
    });

    await workspace!.save();
  });

  it("denies project access to a workspace member who is not a project member", async () => {
    const response = await viewerAgent.get(`/api/tasks/project/${projectId}`);

    expect(response.status).toBe(403);
  });

  it("creates tasks and validates date relationships", async () => {
    const invalid = await ownerAgent
      .post(`/api/tasks/project/${projectId}`)
      .send({
        title: "Invalid dates",
        startDate: "2026-09-20",
        dueDate: "2026-09-18",
      });

    expect(invalid.status).toBe(400);
    expect(invalid.body.message).toBe(
      "Due date cannot be before the start date",
    );

    const first = await ownerAgent
      .post(`/api/tasks/project/${projectId}`)
      .send({
        title: "Build API",
        description: "Test task",
        status: "TODO",
        priority: "HIGH",
        startDate: "2026-09-20",
        dueDate: "2026-09-25",
      });

    expect(first.status).toBe(201);

    taskId = first.body.data.task._id;
    taskVersion = first.body.data.task.version;

    const second = await ownerAgent
      .post(`/api/tasks/project/${projectId}`)
      .send({
        title: "Build frontend",
        status: "TODO",
        priority: "MEDIUM",
      });

    expect(second.status).toBe(201);
    secondTaskId = second.body.data.task._id;
  });

  it("supports server-side task search and filtering", async () => {
    const response = await ownerAgent.get(
      `/api/tasks/project/${projectId}?search=API&status=TODO&priority=HIGH&page=1&limit=10`,
    );

    expect(response.status).toBe(200);
    expect(response.body.data.tasks).toHaveLength(1);
    expect(response.body.data.tasks[0].title).toBe("Build API");
  });

  it("rejects stale task versions with a concurrency conflict", async () => {
    const firstUpdate = await ownerAgent.patch(`/api/tasks/${taskId}`).send({
      version: taskVersion,
      status: "IN_PROGRESS",
    });

    expect(firstUpdate.status).toBe(200);

    const staleUpdate = await ownerAgent.patch(`/api/tasks/${taskId}`).send({
      version: taskVersion,
      priority: "CRITICAL",
    });

    expect(staleUpdate.status).toBe(409);
  });

  it("supports bulk updates and returns per-item results", async () => {
    const taskResponse = await ownerAgent.get(
      `/api/tasks/project/${projectId}`,
    );

    const tasks = taskResponse.body.data.tasks;

    const requestedTasks = tasks.map((task: any) => ({
      id: task._id,
      version: task.version,
    }));

    const response = await ownerAgent.patch("/api/tasks/bulk").send({
      tasks: requestedTasks,
      updates: {
        priority: "MEDIUM",
      },
    });

    expect(response.status).toBe(200);
    expect(response.body.data.successful.length).toBe(2);
    expect(response.body.data.failed.length).toBe(0);
  });

  it("does not expose password hashes through the current-user endpoint", async () => {
    const response = await ownerAgent.get("/api/auth/me");

    expect(response.status).toBe(200);
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  it("supports logout and invalidates the session", async () => {
    const response = await ownerAgent.post("/api/auth/logout");

    expect(response.status).toBe(200);

    const protectedResponse = await ownerAgent.get("/api/auth/me");

    expect(protectedResponse.status).toBe(401);
  });
});
