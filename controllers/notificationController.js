import db from "../config/db.js";

// ============ CREATE NOTIFICATION ============
export const createNotification = async (req, res) => {
    try {
        const {
            user_id,
            user_role,
            title,
            message,
            type,
            priority,
            related_id,
            related_type,
            action_url,
            expires_at
        } = req.body;

        if (!user_id || !user_role || !title || !message) {
            return res.status(400).json({
                success: false,
                message: "user_id, user_role, title, message are required"
            });
        }

        const notification_no = "NOT" + Date.now() + Math.floor(Math.random() * 1000);

        const [result] = await db.query(
            `INSERT INTO notifications 
            (notification_no, user_id, user_role, title, message, type, priority, related_id, related_type, action_url, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [notification_no, user_id, user_role, title, message, type || 'appointment', priority || 'medium', related_id || null, related_type || null, action_url || null, expires_at || null]
        );

        res.status(201).json({
            success: true,
            message: "Notification created successfully",
            notificationId: result.insertId,
            notification_no: notification_no
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ GET NOTIFICATIONS BY USER ============
export const getUserNotifications = async (req, res) => {
    try {
        const { user_id, user_role } = req.params;
        const { is_read, type, limit = 50, offset = 0 } = req.query;

        let query = `
            SELECT 
                n.*,
                CASE 
                    WHEN n.expires_at IS NOT NULL AND n.expires_at < NOW() THEN 'expired'
                    ELSE 'active'
                END as status
            FROM notifications n
            WHERE n.user_id = ? AND n.user_role = ?
        `;
        let params = [user_id, user_role];

        if (is_read !== undefined) {
            query += " AND n.is_read = ?";
            params.push(is_read === 'true' ? 1 : 0);
        }

        if (type) {
            query += " AND n.type = ?";
            params.push(type);
        }

        query += " ORDER BY n.priority = 'high' DESC, n.created_at DESC LIMIT ? OFFSET ?";
        params.push(parseInt(limit), parseInt(offset));

        const [notifications] = await db.query(query, params);

        // Get unread count
        const [unreadCount] = await db.query(
            "SELECT COUNT(*) as unread FROM notifications WHERE user_id = ? AND user_role = ? AND is_read = FALSE AND (expires_at IS NULL OR expires_at > NOW())",
            [user_id, user_role]
        );

        res.status(200).json({
            success: true,
            data: notifications,
            unread_count: unreadCount[0].unread,
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ MARK NOTIFICATION AS READ ============
export const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_role } = req.body;

        const [result] = await db.query(
            "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ? AND user_role = ?",
            [id, user_id, user_role]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or access denied"
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification marked as read"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ MARK ALL NOTIFICATIONS AS READ ============
export const markAllAsRead = async (req, res) => {
    try {
        const { user_id, user_role } = req.body;

        const [result] = await db.query(
            "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND user_role = ? AND is_read = FALSE",
            [user_id, user_role]
        );

        res.status(200).json({
            success: true,
            message: `${result.affectedRows} notifications marked as read`,
            updated_count: result.affectedRows
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ DELETE NOTIFICATION ============
export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, user_role } = req.body;

        const [result] = await db.query(
            "DELETE FROM notifications WHERE id = ? AND user_id = ? AND user_role = ?",
            [id, user_id, user_role]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Notification not found or access denied"
            });
        }

        res.status(200).json({
            success: true,
            message: "Notification deleted successfully"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ SEND PAYMENT NOTIFICATION ============
export const sendPaymentNotification = async (req, res) => {
    try {
        const { appointment_id, payment_status, amount, payment_method } = req.body;

        // Get appointment details with user info
        const [appointment] = await db.query(
            `SELECT a.*, p.full_name as patient_name, d.full_name as doctor_name 
             FROM appointments a 
             JOIN users p ON a.patient_id = p.id 
             JOIN users d ON a.doctor_id = d.id 
             WHERE a.id = ?`,
            [appointment_id]
        );

        if (appointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const apt = appointment[0];
        const notifications = [];

        // Notification for patient
        if (payment_status === 'completed') {
            const patientNotif = {
                user_id: apt.patient_id,
                user_role: 'patient',
                title: 'Payment Successful',
                message: `Payment of ₹${amount} for appointment on ${apt.appointment_date} has been completed via ${payment_method}.`,
                type: 'payment',
                priority: 'high',
                related_id: appointment_id,
                related_type: 'payment'
            };
            notifications.push(patientNotif);
        } else if (payment_status === 'pending') {
            const patientNotif = {
                user_id: apt.patient_id,
                user_role: 'patient',
                title: 'Payment Pending',
                message: `Please complete payment of ₹${amount} for your appointment on ${apt.appointment_date}.`,
                type: 'payment',
                priority: 'high',
                related_id: appointment_id,
                related_type: 'payment'
            };
            notifications.push(patientNotif);
        }

        // Notification for doctor
        if (payment_status === 'completed') {
            const doctorNotif = {
                user_id: apt.doctor_id,
                user_role: 'doctor',
                title: 'Payment Received',
                message: `Payment of ₹${amount} received from patient ${apt.patient_name} for appointment on ${apt.appointment_date}.`,
                type: 'payment',
                priority: 'medium',
                related_id: appointment_id,
                related_type: 'payment'
            };
            notifications.push(doctorNotif);
        }

        // Insert notifications
        const inserted = [];
        for (const notif of notifications) {
            const notification_no = "PAY" + Date.now() + Math.floor(Math.random() * 1000);
            const [result] = await db.query(
                `INSERT INTO notifications 
                (notification_no, user_id, user_role, title, message, type, priority, related_id, related_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [notification_no, notif.user_id, notif.user_role, notif.title, notif.message, notif.type, notif.priority, notif.related_id, notif.related_type]
            );
            inserted.push({ id: result.insertId, ...notif });
        }

        res.status(201).json({
            success: true,
            message: "Payment notifications sent",
            notifications: inserted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ SEND APPOINTMENT REMINDER ============
export const sendAppointmentReminder = async (req, res) => {
    try {
        const { appointment_id, reminder_type } = req.body; // reminder_type: '24h', '1h', 'now'

        const [appointment] = await db.query(
            `SELECT a.*, p.full_name as patient_name, p.phone as patient_phone, d.full_name as doctor_name, c.clinic_name 
             FROM appointments a 
             JOIN users p ON a.patient_id = p.id 
             JOIN users d ON a.doctor_id = d.id 
             JOIN clinics c ON a.clinic_id = c.id 
             WHERE a.id = ?`,
            [appointment_id]
        );

        if (appointment.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Appointment not found"
            });
        }

        const apt = appointment[0];
        const notifications = [];

        let message = "";
        let title = "";

        if (reminder_type === '24h') {
            title = "Appointment Tomorrow";
            message = `Reminder: You have an appointment tomorrow (${apt.appointment_date}) at ${apt.appointment_time} with Dr. ${apt.doctor_name} at ${apt.clinic_name}. Token #${apt.token_number}`;
        } else if (reminder_type === '1h') {
            title = "Appointment in 1 Hour";
            message = `Reminder: Your appointment is in 1 hour at ${apt.appointment_time} with Dr. ${apt.doctor_name}. Please reach on time. Token #${apt.token_number}`;
        } else {
            title = "Appointment Today";
            message = `Reminder: You have an appointment today at ${apt.appointment_time} with Dr. ${apt.doctor_name} at ${apt.clinic_name}. Token #${apt.token_number}`;
        }

        // Patient reminder
        const patientNotif = {
            user_id: apt.patient_id,
            user_role: 'patient',
            title: title,
            message: message,
            type: 'reminder',
            priority: 'high',
            related_id: appointment_id,
            related_type: 'appointment'
        };
        notifications.push(patientNotif);

        // Doctor reminder (optional - for 1h before)
        if (reminder_type === '1h') {
            const doctorNotif = {
                user_id: apt.doctor_id,
                user_role: 'doctor',
                title: "Patient Appointment",
                message: `Patient ${apt.patient_name} has appointment in 1 hour at ${apt.appointment_time}. Token #${apt.token_number}`,
                type: 'reminder',
                priority: 'medium',
                related_id: appointment_id,
                related_type: 'appointment'
            };
            notifications.push(doctorNotif);
        }

        // Insert notifications
        const inserted = [];
        for (const notif of notifications) {
            const notification_no = "REM" + Date.now() + Math.floor(Math.random() * 1000);
            const [result] = await db.query(
                `INSERT INTO notifications 
                (notification_no, user_id, user_role, title, message, type, priority, related_id, related_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [notification_no, notif.user_id, notif.user_role, notif.title, notif.message, notif.type, notif.priority, notif.related_id, notif.related_type]
            );
            inserted.push({ id: result.insertId, ...notif });
        }

        res.status(201).json({
            success: true,
            message: "Reminder notifications sent",
            notifications: inserted
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ GET NOTIFICATION STATISTICS ============
export const getNotificationStats = async (req, res) => {
    try {
        const { user_id, user_role } = req.params;

        const [stats] = await db.query(
            `SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN is_read = FALSE AND (expires_at IS NULL OR expires_at > NOW()) THEN 1 ELSE 0 END) as unread,
                SUM(CASE WHEN type = 'appointment' THEN 1 ELSE 0 END) as appointment_count,
                SUM(CASE WHEN type = 'payment' THEN 1 ELSE 0 END) as payment_count,
                SUM(CASE WHEN type = 'reminder' THEN 1 ELSE 0 END) as reminder_count,
                SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority
            FROM notifications 
            WHERE user_id = ? AND user_role = ?`,
            [user_id, user_role]
        );

        // Last 5 notifications
        const [recent] = await db.query(
            `SELECT id, title, message, type, is_read, created_at 
             FROM notifications 
             WHERE user_id = ? AND user_role = ? 
             ORDER BY created_at DESC 
             LIMIT 5`,
            [user_id, user_role]
        );

        res.status(200).json({
            success: true,
            stats: stats[0],
            recent_notifications: recent
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};