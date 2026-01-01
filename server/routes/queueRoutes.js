// server/routes/queueRoutes.js
import express from "express";
import QueueTicket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";

const router = express.Router();

async function getNextTokenNumber() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const lastTicket = await QueueTicket.findOne({
    joinedAt: { $gte: startOfDay },
  })
    .sort({ tokenNumber: -1 })
    .lean();

  return lastTicket ? lastTicket.tokenNumber + 1 : 1;
}

// POST /api/queue/join


router.post("/join", async (req, res) => {
  try {
    const {
      fullName,
      phone,
      deviceToken,
      serviceKey,
      serviceLabel,
      serviceNote,
    } = req.body || {};

    if (!fullName) {
      return res
        .status(400)
        .json({ message: "Full name is required to join the queue." });
    }

    const tokenNumber = await getNextTokenNumber();

    const ticket = await QueueTicket.create({
      fullName: String(fullName).trim(),
      phone: phone ? String(phone).trim() : "",
      tokenNumber,
      status: "waiting",
      joinedAt: new Date(),
      deviceToken: deviceToken ? String(deviceToken) : "",

      serviceKey: serviceKey ? String(serviceKey) : "",
      serviceLabel: serviceLabel ? String(serviceLabel) : "",
      serviceNote: serviceNote ? String(serviceNote) : "",
    });

    const aheadCount = await QueueTicket.countDocuments({
      status: "waiting",
      joinedAt: { $lt: ticket.joinedAt },
    });

    const waitingCount = await QueueTicket.countDocuments({ status: "waiting" });
    await Counter.updateMany({}, { waitingCount });

    const activity = await Activity.create({
      type: "joined",
      message: `Token #${ticket.tokenNumber} joined the queue`,
      ticket: ticket._id,
    });

    try {
      const io = getIO();
      const counters = await Counter.find().lean();

      io.emit("ticket:joined", {
        ticket: {
          _id: ticket._id,
          fullName: ticket.fullName,
          phone: ticket.phone,
          tokenNumber: ticket.tokenNumber,
          status: ticket.status,
          joinedAt: ticket.joinedAt,
          serviceKey: ticket.serviceKey,
          serviceLabel: ticket.serviceLabel,
          serviceNote: ticket.serviceNote,
        },
        activity,
      });

      io.emit("counters:updated", { counters });
    } catch (socketErr) {
      console.error("Socket emit ticket:joined failed:", socketErr.message);
    }

    res.status(201).json({
      ticket: {
        _id: ticket._id,
        fullName: ticket.fullName,
        phone: ticket.phone,
        tokenNumber: ticket.tokenNumber,
        status: ticket.status,
        serviceKey: ticket.serviceKey,
        serviceLabel: ticket.serviceLabel,
        serviceNote: ticket.serviceNote,
      },
      position: aheadCount + 1,
      ticketId: ticket._id,
      tokenNumber: ticket.tokenNumber,
    });
  } catch (err) {
    console.error("POST /api/queue/join error:", err);
    res.status(500).json({ message: "Failed to join queue" });
  }
});

// GET /api/queue/status/:id
router.get("/status/:id", async (req, res) => {
  try {
    const ticket = await QueueTicket.findById(req.params.id).lean();
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    let position = 0;
    if (ticket.status === "waiting") {
      const aheadCount = await QueueTicket.countDocuments({
        status: "waiting",
        joinedAt: { $lt: ticket.joinedAt },
      });
      position = aheadCount + 1;
    }

    res.json({
      ticket: {
        _id: ticket._id,
        fullName: ticket.fullName,
        phone: ticket.phone,
        tokenNumber: ticket.tokenNumber,
        status: ticket.status,
        counterName: ticket.counterName || null,
        joinedAt: ticket.joinedAt,

        serviceKey: ticket.serviceKey || "",
        serviceLabel: ticket.serviceLabel || "",
        serviceNote: ticket.serviceNote || "",
      },
      position,
    });
  } catch (err) {
    console.error("GET /api/queue/status error:", err);
    res.status(500).json({ message: "Failed to fetch ticket status" });
  }
});

// DELETE /api/queue/ticket/:id  (Public delete)
router.delete("/ticket/:id", async (req, res) => {
  try {
    const ticket = await QueueTicket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // Optional rule: served tickets ko delete block
    if (ticket.status === "served") {
      return res.status(409).json({ message: "Served token cannot be deleted." });
    }

    const ticketId = ticket._id;
    const tokenNumber = ticket.tokenNumber;
    const counterId = ticket.counter;

    await QueueTicket.deleteOne({ _id: ticketId });

    // Update waiting count
    const waitingCount = await QueueTicket.countDocuments({ status: "waiting" });
    await Counter.updateMany({}, { waitingCount });

    // If this token was on a counter, clear it (optional)
    if (counterId) {
      await Counter.updateOne({ _id: counterId }, { nowServingToken: null });
    }

    const activity = await Activity.create({
      type: "deleted",
      message: `Token #${tokenNumber} deleted by user`,
      ticket: ticketId,
    });

    // Socket broadcast
    try {
      const io = getIO();
      const counters = await Counter.find().lean();

      io.emit("ticket:deleted", { ticketId: String(ticketId), tokenNumber });
      io.emit("counters:updated", { counters });
      io.emit("activity:created", { activity });
    } catch (socketErr) {
      console.error("Socket emit ticket:deleted failed:", socketErr.message);
    }

    return res.json({ message: "Token deleted", tokenNumber });
  } catch (err) {
    console.error("DELETE /api/queue/ticket error:", err);
    res.status(500).json({ message: "Failed to delete token" });
  }
});

// GET /api/queue/display-feed
router.get("/display-feed", async (_req, res) => {
  try {
    const [counters, recentActivity, activeTickets] = await Promise.all([
      Counter.find().sort({ createdAt: 1 }).lean(),
      Activity.find({ type: "called" })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      QueueTicket.find({ status: "called" }).lean(),
    ]);

    const countersForDisplay = counters.map((counter) => {
      const active = activeTickets.find((t) => {
        const matchById =
          t.counter &&
          counter._id &&
          t.counter.toString() === counter._id.toString();

        const matchByName =
          t.counterName && counter.name && t.counterName === counter.name;

        return matchById || matchByName;
      });

      return {
        ...counter,
        nowServingToken: active ? active.tokenNumber : null,
      };
    });

    res.json({
      counters: countersForDisplay,
      recentActivity,
    });
  } catch (err) {
    console.error("GET /api/queue/display-feed error:", err);
    res.status(500).json({ message: "Failed to load display feed" });
  }
});

export default router;
