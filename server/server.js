// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import http from "http";



import { connectDB } from "./config/db.js";
import adminRoutes from "./routes/adminRoutes.js";
import queueRoutes from "./routes/queueRoutes.js";
import adminDashboardRoutes from "./routes/adminDashboardRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";
import { initSocket } from "./socket.js";


dotenv.config();
connectDB();

const app = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:5173",
      "https://smartq-cc87b.web.app",
    ],
    credentials: true,
     methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

// Routes
app.get("/", (req, res) => {
  res.send("SmartQ API is running");
});

app.use("/api/admin", adminRoutes);
app.use("/api/admin", adminDashboardRoutes);
app.use("/api/queue", queueRoutes);


// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// http server + socket.io
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
