// server/models/Activity.js
import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["called", "served", "skipped", "joined", "recalled", "deleted"],
      required: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
    },
  },
  { timestamps: true }
);

const Activity = mongoose.model("Activity", activitySchema);

export default Activity;
