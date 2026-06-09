import express from "express";

import {
  createWalkinAppointment,
  getWalkinAppointments,
  getWalkinAppointmentById,
  updateWalkinAppointment,
  deleteWalkinAppointment,
} from "../controllers/walkinAppointmentController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);

// Create
router.post("/", createWalkinAppointment);

// Get All
router.get("/", getWalkinAppointments);

// Get By ID
router.get("/:id", getWalkinAppointmentById);

// Update
router.patch("/:id", updateWalkinAppointment);

// Delete
router.delete("/:id", deleteWalkinAppointment);

export default router;
