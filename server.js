import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/userRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import clinicRoutes from "./routes/clinicRoutes.js";
import walkinAppointmentRoutes from "./routes/walkinAppointmentRoutes.js";
import chatRoutes from './routes/chatRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/users", userRoutes);
app.use(
  "/api/appointments",
  appointmentRoutes
);
app.use("/api/clinics", clinicRoutes);

app.use(
  "/api/walkin-appointments",
  walkinAppointmentRoutes
);


app.use('/api/chat', chatRoutes);
app.get("/", (req, res) => {
  res.send("API Running...");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});