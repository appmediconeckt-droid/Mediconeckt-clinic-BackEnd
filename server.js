import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import userRoutes from "./routes/userRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import clinicRoutes from "./routes/clinicRoutes.js";
import walkinAppointmentRoutes from "./routes/walkinAppointmentRoutes.js";
import chatRoutes from './routes/chatRoutes.js';
import followupRoutes from './routes/followupRoutes.js';
import notificationRoutes from "./routes/notificationRoutes.js";
import { initializeChatSocket } from "./sockets/chatSocket.js";
import availabilityRoutes from './routes/availabilityRoutes.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

initializeChatSocket(io);

app.use(cors());
app.use(express.json());
app.use(express.text({ type: "text/plain" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/users", userRoutes);
app.use(
  "/api/appointments",
  appointmentRoutes
);
app.use("/api/clinics", clinicRoutes);

app.use('/api/availability', availabilityRoutes);

app.use(
  "/api/walkin-appointments",
  walkinAppointmentRoutes
);

app.use('/api/chat', chatRoutes);
app.use('/api/followups', followupRoutes);
app.use("/api", notificationRoutes);

app.get("/", (req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
