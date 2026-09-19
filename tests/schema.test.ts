import mongoose from "mongoose";

import Task from "../models/Task";
import Notification from "../models/Notification";

describe("Mongoose business schemas", () => {
  it("rejects an invalid task status", async () => {
    const task = new Task({
      project: new mongoose.Types.ObjectId(),
      title: "Schema test",
      reporter: new mongoose.Types.ObjectId(),
      status: "INVALID_STATUS",
    });

    await expect(task.validate()).rejects.toThrow();
  });

  it("rejects an invalid task priority", async () => {
    const task = new Task({
      project: new mongoose.Types.ObjectId(),
      title: "Schema test",
      reporter: new mongoose.Types.ObjectId(),
      priority: "INVALID_PRIORITY",
    });

    await expect(task.validate()).rejects.toThrow();
  });

  it("accepts all supported notification types", async () => {
    const types = [
      "ASSIGNMENT",
      "MENTION",
      "COMMENT",
      "DUE_DATE",
      "STATUS_CHANGE",
      "MEMBERSHIP",
    ] as const;

    for (const type of types) {
      const notification = new Notification({
        recipient: new mongoose.Types.ObjectId(),
        type,
        message: "Test notification",
      });

      await expect(notification.validate()).resolves.toBeUndefined();
    }
  });
});
