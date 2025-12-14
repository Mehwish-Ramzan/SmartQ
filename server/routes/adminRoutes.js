// server/routes/adminRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Admin from "../models/Admin.js";
import QueueTicket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import { messaging } from "../firebaseAdmin.js";

const router = express.Router();

/**
 * POST /api/admin/login
 * Body: { username, password }
 * Returns: { token, admin: { id, username } }
 */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username and password are required." });
    }

    const admin = await Admin.findOne({ username }).select("+passwordHash");

    if (!admin) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const ok = await bcrypt.compare(password, admin.passwordHash || "");
    if (!ok) {
      return res.status(401).json({ message: "Invalid username or password." });
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    return res.json({
      token,
      admin: {
        id: admin._id,
        username: admin.username,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/login error:", err);
    return res.status(500).json({ message: "Login failed" });
  }
});

// Helper: recompute GLOBAL waiting count and push to all counters
async function syncGlobalWaitingCount() {
  const waitingCount = await QueueTicket.countDocuments({ status: "waiting" });
  await Counter.updateMany({}, { waitingCount });
  return waitingCount;
}

// Notify first few waiting tickets that they are close to being called
async function notifyUpcomingTickets() {
  const waitingTickets = await QueueTicket.find({
    status: "waiting",
    deviceToken: { $exists: true, $ne: null },
    upcomingNotified: { $ne: true },
  })
    .sort({ joinedAt: 1, tokenNumber: 1 })
    .limit(3); // first 3 in queue

  // assume ~4 minutes per ticket for rough ETA
  const AVG_MIN_PER_TICKET = 4;

  for (let index = 0; index < waitingTickets.length; index++) {
    const t = waitingTickets[index];
    const position = index + 1; // 1 = next, 2 = two ahead, etc.
    const etaMinutes = position * AVG_MIN_PER_TICKET;

    // customise message
    let body = `Token #${t.tokenNumber} will be called soon. Estimated wait ~${etaMinutes} minutes. Please stay nearby.`;

    try {
      await messaging.send({
        token: t.deviceToken,
        notification: {
          title: "Your turn is coming up",
          body,
        },
        data: {
          ticketId: String(t._id),
          tokenNumber: String(t.tokenNumber),
          status: t.status,
          eventType: "upcoming",
          etaMinutes: String(etaMinutes),
        },
      });

      t.upcomingNotified = true;
      await t.save();

      console.log(
        `[FCM] Sent upcoming notification to token #${t.tokenNumber} (position ${position})`
      );
    } catch (err) {
      console.error(
        "[FCM] Error sending upcoming notification:",
        err?.message || err
      );
    }
  }
}

// Helper: send FCM push to ticket's device (if token exists)
async function sendTicketNotification(ticket, eventType, counterName) {
  if (!messaging) return;
  if (!ticket.deviceToken) return;

  const counterLabel = counterName || ticket.counterName || "the counter";

  let title = "SmartQ";
  let body = "";

  if (eventType === "called") {
    title = "Your turn in SmartQ";
    body = `Token #${ticket.tokenNumber} called to ${counterLabel}.`;
  } else if (eventType === "recalled") {
    title = "Reminder from SmartQ";
    body = `Reminder: Token #${ticket.tokenNumber} at ${counterLabel}.`;
  } else if (eventType === "upcoming") {
    title = "You’re almost at the front";
    body = `Token #${ticket.tokenNumber} will be called soon. Please be ready near ${counterLabel}.`;
  } else {
    body = `Update for token #${ticket.tokenNumber}.`;
  }

  try {
    await messaging.send({
      token: ticket.deviceToken,
      notification: { title, body },
      data: {
        ticketId: String(ticket._id),
        tokenNumber: String(ticket.tokenNumber),
        counterName: counterLabel,
        status: ticket.status,
        eventType,
      },
    });
    console.log(
      `[FCM] Sent ${eventType} notification to token #${ticket.tokenNumber}`
    );
  } catch (err) {
    console.error("[FCM] Error sending notification:", err?.message || err);
  }
}

/**
 * GET /api/admin/queue
 * Query params: status=all|waiting|called|served|skipped, q=search
 */
router.get("/queue", requireAdminAuth, async (req, res) => {
  try {
    const { status = "all", q = "" } = req.query;

    const filter = {};
    if (status !== "all") {
      filter.status = status;
    }

    if (q) {
      const search = q.trim();
      const tokenNumber = Number(search);
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        ...(Number.isFinite(tokenNumber) ? [{ tokenNumber }] : []),
      ];
    }

    const tickets = await QueueTicket.find(filter).sort({ joinedAt: 1 }).lean();

    res.json({ tickets });
  } catch (err) {
    console.error("GET /api/admin/queue error:", err);
    res.status(500).json({ message: "Failed to load queue" });
  }
});

/**
 * POST /api/admin/queue/call-next
 * Auto-assigns next waiting ticket to a counter (round-robin by tokenNumber).
 */
router.post("/queue/call-next", requireAdminAuth, async (_req, res) => {
  try {
    const io = getIO();

    // Oldest waiting ticket
    const ticket = await QueueTicket.findOne({ status: "waiting" }).sort({
      joinedAt: 1,
      tokenNumber: 1,
    });

    if (!ticket) {
      return res.status(404).json({ message: "No waiting tickets." });
    }

    // Treat `online: true` OR `online` missing as online
    const counters = await Counter.find({
      $or: [{ online: true }, { online: { $exists: false } }],
    }).sort({ createdAt: 1 });

    if (!counters.length) {
      return res.status(409).json({ message: "No online counters available." });
    }

    const index = (ticket.tokenNumber - 1) % counters.length;
    const counter = counters[index];

    ticket.status = "called";
    ticket.counterName = counter.name;
    ticket.calledAt = new Date();
    await ticket.save();

    await syncGlobalWaitingCount();

    counter.nowServingToken = ticket.tokenNumber;
    await counter.save();

    const activity = await Activity.create({
      type: "called",
      message: `Token #${ticket.tokenNumber} called to ${counter.name}`,
      ticket: ticket._id,
    });

    if (io) {
      const allCounters = await Counter.find().lean();
      io.emit("ticket:called", { ticket, activity });
      io.emit("counters:updated", { counters: allCounters });
    }

    // FCM: called
    await sendTicketNotification(ticket, "called", counter.name);

    // FCM: upcoming for next tickets
    await notifyUpcomingTickets();

    res.json({
      ticket: {
        _id: ticket._id,
        fullName: ticket.fullName,
        phone: ticket.phone,
        tokenNumber: ticket.tokenNumber,
        status: ticket.status,
        counterName: ticket.counterName,
      },
      counter: {
        _id: counter._id,
        name: counter.name,
        nowServingToken: counter.nowServingToken,
      },
    });
  } catch (err) {
    console.error("POST /api/admin/queue/call-next error:", err);
    res.status(500).json({ message: "Failed to call next ticket" });
  }
});

/**
 * POST /api/admin/queue/:ticketId/serve
 */
router.post("/queue/:ticketId/serve", requireAdminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await QueueTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status !== "called" && ticket.status !== "serving") {
      return res
        .status(400)
        .json({ message: "Only called tickets can be served." });
    }

    ticket.status = "served";
    ticket.servedAt = new Date();
    await ticket.save();

    // 👇 IMPORTANT: clear counter's nowServingToken
    if (ticket.counter._id) {
      await Counter.findByIdAndUpdate(ticket.counter._id, {
        $set: { nowServingToken: null },
      });
    }

    await Activity.create({
      type: "served",
      message: `Token #${ticket.tokenNumber} served at ${
        ticket.counterName || "counter"
      }`,
      ticket: ticket._id,
    });

    const io = getIO();
    if (io) {
      io.emit("ticket:updated", { ticketId: ticket._id, status: "served" });
    }

    // 👉 waitingCount ko re-sync karo
    const waitingCount = await syncGlobalWaitingCount();
    if (io) {
      const allCounters = await Counter.find().lean();
      io.emit("counters:updated", { counters: allCounters });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/queue/:ticketId/serve error:", err);
    res.status(500).json({ message: "Failed to serve ticket" });
  }
});

/**
 * POST /api/admin/queue/:ticketId/skip
 */
router.post("/queue/:ticketId/skip", requireAdminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await QueueTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status !== "called" && ticket.status !== "waiting") {
      return res
        .status(400)
        .json({ message: "Only waiting or called tickets can be skipped." });
    }

    ticket.status = "skipped";
    ticket.skippedAt = new Date();
    await ticket.save();

    const activity = await Activity.create({
      type: "skipped",
      message: `Token #${ticket.tokenNumber} skipped${
        ticket.counterName ? ` at ${ticket.counterName}` : ""
      }`,
      ticket: ticket._id,
    });

    const io = getIO();
    if (io) {
      io.emit("ticket:updated", { ticketId: ticket._id, status: "skipped" });
      io.emit("activity:created", { activity });
    }

    // 👉 update waiting count + broadcast
    const waitingCount = await syncGlobalWaitingCount();
    if (io) {
      const allCounters = await Counter.find().lean();
      io.emit("counters:updated", { counters: allCounters });
    }

    await syncGlobalWaitingCount();

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/queue/:ticketId/skip error:", err);
    res.status(500).json({ message: "Failed to skip ticket" });
  }
});

/**
 * POST /api/admin/queue/:ticketId/recall
 * Used for recalling a skipped / already-called ticket
 */
router.post("/queue/:ticketId/recall", requireAdminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticket = await QueueTicket.findById(ticketId);

    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    if (ticket.status !== "skipped" && ticket.status !== "called") {
      return res.status(400).json({
        message: "Only skipped or already called tickets can be recalled.",
      });
    }

    ticket.status = "called";
    ticket.calledAt = new Date();
    await ticket.save();

    const activity = await Activity.create({
      type: "recalled",
      message: `Token #${ticket.tokenNumber} recalled to ${
        ticket.counterName || "counter"
      }`,
      ticket: ticket._id,
    });

    const io = getIO();
    if (io) {
      io.emit("ticket:recalled", { ticket, activity });
    }

    // FCM push
    await sendTicketNotification(ticket, "recalled", ticket.counterName);

    res.json({ success: true });
  } catch (err) {
    console.error("POST /api/admin/queue/:ticketId/recall error:", err);
    res.status(500).json({ message: "Failed to recall ticket" });
  }
});

export default router;
