import db from '../config/db.js'; // aapki database connection

class ChatController {
    // Send message
    async sendMessage(req, res) {
        try {
            const { receiver_id, message } = req.body;
            const sender_id = req.user.id;

            if (!receiver_id || !message) {
                return res.status(400).json({
                    success: false,
                    message: "Receiver ID and message are required"
                });
            }

            // Insert message
            const [result] = await db.execute(
                `INSERT INTO chat_messages (sender_id, receiver_id, message, created_at) 
                 VALUES (?, ?, ?, NOW())`,
                [sender_id, receiver_id, message]
            );

            // Get inserted message
            const [newMessage] = await db.execute(
                `SELECT cm.*, 
                    u1.name as sender_name, 
                    u2.name as receiver_name
                FROM chat_messages cm
                JOIN users u1 ON cm.sender_id = u1.id
                JOIN users u2 ON cm.receiver_id = u2.id
                WHERE cm.id = ?`,
                [result.insertId]
            );

            res.status(201).json({
                success: true,
                message: "Message sent",
                data: newMessage[0]
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }

    // Get conversation between two users
    async getConversation(req, res) {
        try {
            const { user_id } = req.params;
            const current_user_id = req.user.id;

            const [messages] = await db.execute(
                `SELECT 
                    cm.id,
                    cm.sender_id,
                    cm.receiver_id,
                    cm.message,
                    cm.is_read,
                    cm.created_at,
                    u1.name as sender_name,
                    u2.name as receiver_name
                FROM chat_messages cm
                JOIN users u1 ON cm.sender_id = u1.id
                JOIN users u2 ON cm.receiver_id = u2.id
                WHERE (sender_id = ? AND receiver_id = ?) 
                   OR (sender_id = ? AND receiver_id = ?)
                ORDER BY cm.created_at ASC`,
                [current_user_id, user_id, user_id, current_user_id]
            );

            // Mark messages as read
            await db.execute(
                `UPDATE chat_messages 
                 SET is_read = 1, read_at = NOW() 
                 WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`,
                [current_user_id, user_id]
            );

            res.json({
                success: true,
                data: messages,
                count: messages.length
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }

    // Get all chat list (conversations)
    async getChatList(req, res) {
        try {
            const user_id = req.user.id;

            const [conversations] = await db.execute(
                `SELECT 
                    u.id as user_id,
                    u.name as user_name,
                    u.role as user_role,
                    (
                        SELECT message 
                        FROM chat_messages 
                        WHERE (sender_id = ? AND receiver_id = u.id) 
                           OR (sender_id = u.id AND receiver_id = ?)
                        ORDER BY created_at DESC 
                        LIMIT 1
                    ) as last_message,
                    (
                        SELECT COUNT(*) 
                        FROM chat_messages 
                        WHERE receiver_id = ? AND sender_id = u.id AND is_read = 0
                    ) as unread_count
                FROM users u
                WHERE u.id IN (
                    SELECT DISTINCT 
                        CASE 
                            WHEN sender_id = ? THEN receiver_id
                            WHEN receiver_id = ? THEN sender_id
                        END
                    FROM chat_messages
                    WHERE sender_id = ? OR receiver_id = ?
                )
                ORDER BY (
                    SELECT created_at 
                    FROM chat_messages 
                    WHERE (sender_id = ? AND receiver_id = u.id) 
                       OR (sender_id = u.id AND receiver_id = ?)
                    ORDER BY created_at DESC 
                    LIMIT 1
                ) DESC`,
                [user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id, user_id]
            );

            res.json({
                success: true,
                data: conversations
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }

    // Get unread count
    async getUnreadCount(req, res) {
        try {
            const user_id = req.user.id;

            const [result] = await db.execute(
                `SELECT COUNT(*) as count 
                FROM chat_messages 
                WHERE receiver_id = ? AND is_read = 0`,
                [user_id]
            );

            res.json({
                success: true,
                unread_count: result[0].count
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }

    // Delete message
    async deleteMessage(req, res) {
        try {
            const { message_id } = req.params;
            const user_id = req.user.id;

            const [result] = await db.execute(
                `DELETE FROM chat_messages 
                WHERE id = ? AND (sender_id = ? OR receiver_id = ?)`,
                [message_id, user_id, user_id]
            );

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    success: false,
                    message: "Message not found"
                });
            }

            res.json({
                success: true,
                message: "Message deleted"
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }

    // Get all doctors (for patients)
    async getDoctors(req, res) {
        try {
            const [doctors] = await db.execute(
                `SELECT id, name, email, role 
                FROM users 
                WHERE role = 'doctor'`
            );

            res.json({
                success: true,
                data: doctors
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    }
}

export default new ChatController();