import express from "express";
import multer from "multer";

import {
  createClinic,
  getClinics,
  getClinicById,
  updateClinic,
  deleteClinic,
} from "../controllers/clinicController.js";

const router = express.Router();

// Multer setup for handling file uploads (clinic_photo)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// Create clinic (accepts multipart/form-data with optional `clinic_photo`)
router.post("/", upload.single("clinic_photo"), createClinic);

router.get("/", getClinics);

router.get("/:id", getClinicById);

// Update clinic (accepts multipart/form-data with optional `clinic_photo`)
router.patch("/:id", upload.single("clinic_photo"), updateClinic);

router.delete("/:id", deleteClinic);

export default router;