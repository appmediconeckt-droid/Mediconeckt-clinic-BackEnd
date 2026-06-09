import express from "express";
import {
    createNotification,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    sendPaymentNotification,
    sendAppointmentReminder,
    getNotificationStats
} from "../controllers/notificationController.js";

const router = express.Router();

// Notification CRUD
router.post("/notifications", createNotification);
router.get("/notifications/:user_id/:user_role", getUserNotifications);
router.put("/notifications/:id/read", markAsRead);
router.put("/notifications/mark-all-read", markAllAsRead);
router.delete("/notifications/:id", deleteNotification);

// Specialized notifications
router.post("/notifications/payment", sendPaymentNotification);
router.post("/notifications/reminder", sendAppointmentReminder);

// Statistics
router.get("/notifications/stats/:user_id/:user_role", getNotificationStats);

export default router;