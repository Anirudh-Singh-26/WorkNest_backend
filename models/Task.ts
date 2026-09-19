import mongoose, { Document, Schema } from "mongoose";

export interface ITask extends Document {
  project: mongoose.Types.ObjectId;

  title: string;
  description?: string;

  assignee?: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;

  status: "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "BLOCKED" | "COMPLETED";

  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

  startDate?: Date;
  dueDate?: Date;
  completedAt?: Date;

  version: number;

  labels: string[];

  dependencies: mongoose.Types.ObjectId[];

  estimate?: number;

  order: number;

  archivedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 200,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 5000,
    },

    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["TODO", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETED"],
      default: "TODO",
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },

    startDate: {
      type: Date,
    },

    version: {
      type: Number,
      default: 0,
    },

    dueDate: {
      type: Date,
    },

    completedAt: {
      type: Date,
    },

    labels: [
      {
        type: String,
        trim: true,
      },
    ],

    estimate: {
      type: Number,
      min: 0,
    },

    order: {
      type: Number,
      default: 0,
    },

    dependencies: [
      {
        type: Schema.Types.ObjectId,
        ref: "Task",
      },
    ],

    archivedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

taskSchema.index({
  project: 1,
  status: 1,
  order: 1,
});

taskSchema.index({
  assignee: 1,
  status: 1,
});

const Task = mongoose.model<ITask>("Task", taskSchema);

export default Task;
