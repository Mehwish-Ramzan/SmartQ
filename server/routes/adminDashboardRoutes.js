// server/routes/adminDashBoardRoutes.js
import express from "express";
import { requireAdminAuth } from "../middleware/authMiddleware.js";
import QueueTicket from "../models/Ticket.js";
import Counter from "../models/Counter.js";
import Activity from "../models/Activity.js";
import { getIO } from "../socket.js";
import { sendTurnNotification } from "../fcm.js";

const router = express.Router();

// Active "called" tickets se counters ka nowServingToken calculate karo
async function buildCountersForDisplay() {
  // counters ko order ke sath lao
  let counters = await Counter.find().sort({ createdAt: 1 }).lean();

  // agar pehli dafa hai to default 3 counters create karo
  if (!counters.length) {
    const created = await Counter.insertMany([
      { name: "Counter 1" },
      { name: "Counter 2" },
      { name: "Counter 3" },
    ]);

    counters = created.map((c) =>
      typeof c.toObject === "function" ? c.toObject() : c
    );
  }

  // sirf abhi "called" tickets
  const activeTickets = await QueueTicket.find({ status: "called" }).lean();

  return counters.map((counter) => {
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
      // agar active ticket mila to uska tokenNumber, warna null
      nowServingToken: active ? active.tokenNumber : null,
    };
  });
}

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
    const counters = await buildCountersForDisplay();
    // let counters = await Counter.find().lean();

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

    if (!ticket) return res.status(404).json({ message: "No waiting tickets" });

    let counter = null;
    if (counterId) counter = await Counter.findById(counterId);
    if (!counter) counter = await Counter.findOne({ online: { $ne: false } }).sort({ createdAt: 1 });

    if (!counter) {
      // ticket ko wapas waiting pe set karna optional hai
      ticket.status = "waiting";
      await ticket.save();
      return res.status(409).json({ message: "No online counters available." });
    }

    ticket.counter = counter._id;
    ticket.counterName = counter.name;
    await ticket.save();

    const waitingCount = await QueueTicket.countDocuments({ status: "waiting" });
    counter.nowServingToken = ticket.tokenNumber;
    counter.waitingCount = waitingCount;
    await counter.save();

    const activity = await Activity.create({
      type: "called",
      message: `Token #${ticket.tokenNumber} called to ${counter.name}`,
      ticket: ticket._id,
    });

    // socket broadcast
    try {
      const io = getIO();
      const counters = await Counter.find().lean();
      io.emit("ticket:called", { ticket });
      io.emit("counters:updated", { counters });
      io.emit("activity:created", { activity });
    } catch (e) {
      console.error("socket emit failed:", e.message);
    }

    // push notification (optional)
    try {
      await sendTurnNotification(ticket, counter.name);
    } catch (e) {
      console.error("FCM send failed:", e.message);
    }

    return res.json({ ticket, counter });
  } catch (err) {
    console.error("POST /api/admin/queue/call-next error:", err);
    res.status(500).json({ message: "Failed to call next ticket" });
  }
});

// POST /api/admin/queue/:ticketId/call
router.post("/queue/:ticketId/call", requireAdminAuth, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { counterId } = req.body || {};

    // 1) ticket find
    const ticket = await QueueTicket.findById(ticketId);
    if (!ticket) return res.status(404).json({ message: "Ticket not found" });

    // 2) only waiting tickets can be called (aap chaho to skipped bhi allow kar sakte ho)
    if ((ticket.status || "").toLowerCase() !== "waiting") {
      return res.status(409).json({
        message: `Ticket is not waiting (current: ${ticket.status})`,
      });
    }

    // 3) pick counter (prefer counterId, otherwise first online)
    let counter = null;

    if (counterId) {
      counter = await Counter.findOne({
        _id: counterId,
        online: { $ne: false },
      });
    }

    if (!counter) {
      counter = await Counter.findOne({ online: { $ne: false } }).sort({
        createdAt: 1,
      });
    }

    if (!counter) {
      return res.status(409).json({ message: "No online counters available." });
    }

    // 4) optional safety: same counter par agar koi aur ticket already "called" hai
    // usko wapas waiting kar do (takay ek counter par multiple called na ho)
    await QueueTicket.updateMany(
      {
        _id: { $ne: ticket._id },
        status: "called",
        $or: [
          { counter: counter._id },
          { counterName: counter.name },
        ],
      },
      {
        $set: { status: "waiting" },
        $unset: { counter: 1, counterName: 1 },
      }
    );

    // 5) set ticket -> called + counter assign
    ticket.status = "called";
    ticket.counter = counter._id;
    ticket.counterName = counter.name;
    await ticket.save();

    // 6) update counter stats
    const waitingCount = await QueueTicket.countDocuments({ status: "waiting" });
    counter.nowServingToken = ticket.tokenNumber;
    counter.waitingCount = waitingCount;
    await counter.save();

    // 7) activity log
    const activity = await Activity.create({
      type: "called",
      message: `Token #${ticket.tokenNumber} called to ${counter.name}`,
      ticket: ticket._id,
    });

    // 8) socket broadcast
    try {
      const io = getIO();
      const counters = await Counter.find().lean();
      io.emit("ticket:called", { ticket });
      io.emit("counters:updated", { counters });
      io.emit("activity:created", { activity });
    } catch (e) {
      console.error("socket emit failed:", e.message);
    }

    // 9) push notification
    try {
      await sendTurnNotification(ticket, counter.name);
    } catch (e) {
      console.error("FCM send failed:", e.message);
    }

    return res.json({ ticket, counter });
  } catch (err) {
    console.error("POST /api/admin/queue/:ticketId/call error:", err);
    res.status(500).json({ message: "Failed to call ticket" });
  }
});







export default router;
