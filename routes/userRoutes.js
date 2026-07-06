import express from "express";
import upload from "../middleware/upload.js";

import {
  register,
  login,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getProfileById ,
  updateProfileById,
  getDoctorQRById,
  changePassword,
  verifyPassword,
} from "../controllers/userController.js";

const router = express.Router();


// Auth
router.post("/register", upload.none(), register);
router.post("/login", upload.none(), login);

// Users CRUD
router.get("/", getUsers);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);
router.get("/doctor-qr/:id", getDoctorQRById);
router.get("/doctor-profile/:id", getProfileById);
router.put(
  "/doctor-profile/:id",
  upload.single("profilePic"),
  updateProfileById
);
router.post("/change-password", changePassword);

// Verify password route (optional - for confirmation before sensitive operations)
router.post("/verify-password", verifyPassword);


export default router;
