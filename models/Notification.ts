import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  actor?: mongoose.Types.ObjectId;
  type:
    | "ASSIGNMENT"
    | "MENTION"
    | "COMMENT"
    | "DUE_DATE"
    | "STATUS_CHANGE"
    | "MEMBERSHIP";
  message: string;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  readAt?: Date;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    type: {
      type: String,
      enum: [
        "ASSIGNMENT",
        "MENTION",
        "COMMENT",
        "DUE_DATE",
        "STATUS_CHANGE",
        "MEMBERSHIP",
      ],
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    entityType: {
      type: String,
    },

    entityId: {
      type: Schema.Types.ObjectId,
    },

    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

notificationSchema.index({
  recipient: 1,
  createdAt: -1,
});

const Notification = mongoose.model<INotification>(
  "Notification",
  notificationSchema,
);

export default Notification;
