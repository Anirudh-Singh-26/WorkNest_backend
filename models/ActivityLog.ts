import mongoose, { Document, Schema } from "mongoose";

export interface IActivityLog extends Document {
  actor: mongoose.Types.ObjectId;
  entityType: string;
  entityId: mongoose.Types.ObjectId;
  action: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    entityType: {
      type: String,
      required: true,
    },

    entityId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    action: {
      type: String,
      required: true,
    },

    before: {
      type: Schema.Types.Mixed,
    },

    after: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: {
      createdAt: true,
      updatedAt: false,
    },
  },
);

activityLogSchema.index({
  entityType: 1,
  entityId: 1,
  createdAt: -1,
});

const ActivityLog = mongoose.model<IActivityLog>(
  "ActivityLog",
  activityLogSchema,
);

export default ActivityLog;
