
import { io } from "socket.io-client";

// API server (socket) runs on 5000, not Vite 5173.
const SOCKET_URL =
  import.meta.env.VITE_API_URL?.replace(/\/$/, "") || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  transports: ["websocket"],
});
