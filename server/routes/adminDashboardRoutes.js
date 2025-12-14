// server/routes/adminDashBoardRoutes.js
import express from "express";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import QueueTicket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";
import { sendTurnNotification } from "../fcm.js";

const router = express.Router();

function buildQueueFilter({ status, q }) {
  const filter = {};

  if (status && status !== "all") {
    filter.status = status.toLowerCase();
  }

  if (q && q.trim()) {
    const search = q.trim();
    const tokenNumber = Number.isNaN(Number(search)) ? null : Number(search);

    filter.$or = [
      { fullName: new RegExp(search, "i") },
      { phone: new RegExp(search, "i") },
      ...(tokenNumber !== null ? [{ tokenNumber }] : []),
    ];
  }

  return filter;
}

// GET /api/admin/queue
router.get("/queue", requireAdminAuth, async (req, res) => {
  try {
    const { status = "all", q = "" } = req.query;
    const filter = buildQueueFilter({ status, q });

    const tickets = await QueueTicket.find(filter)
      .sort({ joinedAt: 1 })
      .limit(200)
      .lean();

    res.json({ tickets });
  } catch (err) {
    console.error("GET /api/admin/queue error:", err);
    res.status(500).json({ message: "Failed to load queue" });
  }
});

// GET /api/admin/counters
router.get("/counters", requireAdminAuth, async (_req, res) => {
  try {
    let counters = await Counter.find().lean();

    if (!counters.length) {
      counters = await Counter.insertMany([
        { name: "Counter 1" },
        { name: "Counter 2" },
        { name: "Counter 3" },
      ]);
    }

    res.json({ counters });
  } catch (err) {
    console.error("GET /api/admin/counters error:", err);
    res.status(500).json({ message: "Failed to load counters" });
  }
});

// GET /api/admin/activity
router.get("/activity", requireAdminAuth, async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 10;

    const items = await Activity.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ items });
  } catch (err) {
    console.error("GET /api/admin/activity error:", err);
    res.status(500).json({ message: "Failed to load activity" });
  }
});

// POST /api/admin/queue/call-next
router.post("/queue/call-next", requireAdminAuth, async (req, res) => {
  try {
    const { counterId } = req.body;

    const ticket = await QueueTicket.findOneAndUpdate(
      { status: "waiting" },
      { status: "called" },
      { sort: { joinedAt: 1 }, new: true }
    );

    if (!ticket) {
      return res.status(404).json({ message: "No waiting tickets" });
    }

    let counter = null;

    if (counterId) {
      counter = await Counter.findById(counterId);
    }

    if (!counter) {
      counter = await Counter.findOne().sort({ createdAt: 1 });
    }

    if (counter) {
      ticket.counterName = counter.name;
      await ticket.save();

      const waitingCount = await QueueTicket.countDocuments({
        status: "waiting",
      });
      counter.nowServingToken = ticket.tokenNumber;
      counter.waitingCount = waitingCount;
      await counter.save();
    }

    const activity = await Activity.create({
      type: "called",
      message: `Token #${ticket.tokenNumber} called to ${
        counter ? counter.name : "counter"
      }`,
      ticket: ticket._id,
    });

    // Broadcast updates via Socket.IO
    try {
      const io = getIO();

      // specific event when a ticket is called
      io.emit("ticket:called", {
        ticket: {
          _id: ticket._id,
          tokenNumber: ticket.tokenNumber,
          status: ticket.status,
          counterName: ticket.counterName || (counter ? counter.name : null),
        },
        counter: counter
          ? {
              _id: counter._id,
              name: counter.name,
              nowServingToken: counter.nowServingToken,
              waitingCount: counter.waitingCount,
            }
          : null,
        activity,
      });

      // updated counters list for display / admin
      const counters = await Counter.find().lean();
      io.emit("counters:updated", { counters });
    } catch (socketErr) {
      console.error("Socket emit from call-next failed:", socketErr.message);
    }

    res.json({ ticket, counter });
    // 👇 push notification yahi se:
    if (nextTicket) {
      sendTurnNotification(nextTicket, counter?.name);
    }

    return res.json({ ticket: nextTicket, counter });
  } catch (err) {
    console.error("POST /api/admin/queue/call-next error:", err);
    res.status(500).json({ message: "Failed to call next ticket" });
  }
});

export default router;
