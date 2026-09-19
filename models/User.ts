import mongoose, { Document, Schema } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: "OWNER" | "ADMIN" | "MANAGER" | "MEMBER" | "VIEWER";
  avatar?: string;
  lastActiveAt?: Date;
  tokenVersion: number;

  notificationPreferences: {
    assignments: boolean;
    mentions: boolean;
    comments: boolean;
    statusChanges: boolean;
    dueDateReminders: boolean;
    membershipChanges: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MANAGER", "MEMBER", "VIEWER"],
      default: "MEMBER",
    },

    avatar: {
      type: String,
    },

    lastActiveAt: {
      type: Date,
    },
    
    tokenVersion: {
      type: Number,
      default: 0,
    },

    notificationPreferences: {
      assignments: {
        type: Boolean,
        default: true,
      },

      mentions: {
        type: Boolean,
        default: true,
      },

      comments: {
        type: Boolean,
        default: true,
      },

      statusChanges: {
        type: Boolean,
        default: true,
      },

      dueDateReminders: {
        type: Boolean,
        default: true,
      },

      membershipChanges: {
        type: Boolean,
        default: true,
      },
    },
  },

  {
    timestamps: true,
  },
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;
