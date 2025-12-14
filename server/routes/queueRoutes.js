// server/routes/queueRoutes.js
import express from "express";
import QueueTicket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";

const router = express.Router();

// Helper: next token number for *today*
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
// Public: user joins the queue
router.post("/join", async (req, res) => {
  try {
    const { fullName, phone, deviceToken } = req.body || {};

    // Full name required, phone optional
    if (!fullName) {
      return res
        .status(400)
        .json({ message: "Full name is required to join the queue." });
    }

    const tokenNumber = await getNextTokenNumber();

    const ticket = await QueueTicket.create({
      fullName: fullName.trim(),
      phone: phone || "",
      tokenNumber,
      status: "waiting",
      joinedAt: new Date(),
      deviceToken,
      deviceToken: deviceToken || "", // 👈 SAVE TOKEN HERE
    });

    // how many people are ahead of this ticket
    const aheadCount = await QueueTicket.countDocuments({
      status: "waiting",
      joinedAt: { $lt: ticket.joinedAt },
    });

    // Recompute global waiting count and sync to all counters
    const waitingCount = await QueueTicket.countDocuments({
      status: "waiting",
    });
    await Counter.updateMany({}, { waitingCount });

    // Log "joined" activity
    const activity = await Activity.create({
      type: "joined",
      message: `Token #${ticket.tokenNumber} joined the queue`,
      ticket: ticket._id,
    });

    // Broadcast to admin dashboard / displays via socket.io
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
// Public: specific user checks their ticket status
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
      },
      position,
    });
  } catch (err) {
    console.error("GET /api/queue/status error:", err);
    res.status(500).json({ message: "Failed to fetch ticket status" });
  }
});

// GET /api/queue/display-feed
// Public: data for TV display screen
router.get("/display-feed", async (_req, res) => {
  try {
    const counters = await Counter.find().sort({ createdAt: 1 }).lean();

    const recentActivity = await Activity.find({ type: "called" })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({ counters, recentActivity });
  } catch (err) {
    console.error("GET /api/queue/display-feed error:", err);
    res.status(500).json({ message: "Failed to load display feed" });
  }
});

export default router;
