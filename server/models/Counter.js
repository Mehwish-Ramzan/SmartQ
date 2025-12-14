// server/models/Counter.js
import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    nowServingToken: {
      type: Number,
      default: null,
    },
    waitingCount: {
      type: Number,
      default: 0,
    },
    avgSecondsPerTicket: {
      type: Number,
      default: 240, // ~4 minutes
    },
    online: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Counter = mongoose.model("Counter", counterSchema);

export default Counter;
