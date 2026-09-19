import mongoose, { Schema } from "mongoose";

const savedFilterSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },

    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

savedFilterSchema.index({
  user: 1,
  project: 1,
});

export default mongoose.model("SavedFilter", savedFilterSchema);
