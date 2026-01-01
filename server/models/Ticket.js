import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String }, // international number (optional)
    tokenNumber: { type: Number, required: true },

    status: {
      type: String,
      enum: ["waiting", "called", "serving", "served", "skipped", "cancelled"],
      default: "waiting",
    },

    // OLD field – ab isko default mat do
    // sirf legacy ke liye rehne do, UI isko use nahi karegi
    counter: { type: String, default: "" },

    // NEW field – yahi har call / recall pe set ho raha hai
    counterName: { type: String, default: "" },

    // FCM device token (optional)
    deviceToken: { type: String, default: "" },

    joinedAt: { type: Date, default: Date.now },

    // server/models/Ticket.js (add these fields in schema)
    serviceKey: { type: String, default: "" },
    serviceLabel: { type: String, default: "" },
    serviceNote: { type: String, default: "" },

    // For TTL auto-delete after 48 hours:
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 48 * 60 * 60 * 1000),
      index: { expires: 0 }, // Mongo TTL index (expire at this exact time)
    },
    upcomingNotified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Ticket", ticketSchema);
