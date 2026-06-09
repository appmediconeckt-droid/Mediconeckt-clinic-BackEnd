import express from "express";
import multer from "multer";
import {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getDoctorQRById,
  changePassword,
  verifyPassword,
} from "../controllers/userController.js";

const router = express.Router();
const upload = multer();

// Auth
router.post("/register", upload.none(), register);
router.post("/login", upload.none(), login);

// Users CRUD
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/doctor-qr/:id", getDoctorQRById);

router.post("/change-password", changePassword);

// Verify password route (optional - for confirmation before sensitive operations)
router.post("/verify-password", verifyPassword);


export default router;
