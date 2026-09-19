import mongoose, { Document, Schema } from "mongoose";

export interface IProject extends Document {
  workspace: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status: "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "ARCHIVED";
  members: mongoose.Types.ObjectId[];
  archivedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    workspace: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["PLANNED", "IN_PROGRESS", "COMPLETED", "ARCHIVED"],
      default: "PLANNED",
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
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

const Project = mongoose.model<IProject>("Project", projectSchema);

export default Project;
