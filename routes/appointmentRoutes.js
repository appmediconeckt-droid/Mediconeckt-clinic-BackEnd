import express from "express";
import {
  createAppointment,
  getAppointments,
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
  nurseCheckIn,
  getTodayAppointments,
  searchAppointment,
  getAppointmentsByPatientId, 
} from "../controllers/appointmentController.js";

const router = express.Router();

router.post("/", createAppointment);

router.get("/", getAppointments);

router.get("/:id", getAppointmentById);



router.get("/patient/:patientId", getAppointmentsByPatientId);

router.patch("/:id", updateAppointment);

router.delete("/:id", deleteAppointment);

router.put("/checkin/:id", nurseCheckIn);           // Nurse adds vital signs
router.get("/today/appointments", getTodayAppointments);  // Get today's appointments
router.get("/search/appointment", searchAppointment); 

export default router;