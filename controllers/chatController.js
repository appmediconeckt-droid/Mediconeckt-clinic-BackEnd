import {
  deleteMessageForUser,
  getAiReply,
  getAiUserId,
  getChatListForUser,
  getConversationMessages,
  getDoctors,
  getUnreadCountForUser,
  markConversationRead,
  saveMessage,
} from "../services/chatService.js";
import db from "../config/db.js";

class ChatController {
  async sendMessage(req, res) {
    try {
      const { receiver_id, message } = req.body;
      const sender_id = req.user.id;

      if (!receiver_id || !message) {
        return res.status(400).json({
          success: false,
          message: "Receiver ID and message are required",
        });
      }

      const newMessage = await saveMessage({
        sender_id,
        receiver_id,
        message,
      });

      res.status(201).json({
        success: true,
        message: "Message sent",
        data: newMessage,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async sendAiMessage(req, res) {
    try {
      const { message } = req.body;
      const sender_id = req.user.id;

      if (!message) {
        return res.status(400).json({
          success: false,
          message: "Message is required",
        });
      }

      const aiUserId = await getAiUserId();
      const userMessage = await saveMessage({
        sender_id,
        receiver_id: aiUserId,
        message,
      });

      const aiReply = await getAiReply(message);
      const aiMessage = await saveMessage({
        sender_id: aiUserId,
        receiver_id: sender_id,
        message: aiReply,
      });

      res.status(201).json({
        success: true,
        message: "AI message sent",
        data: {
          user_message: userMessage,
          ai_message: aiMessage,
          ai_user_id: aiUserId,
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: error.message || "Server error",
      });
    }
  }

  async getConversation(req, res) {
    try {
      const { user_id } = req.params;
      const current_user_id = req.user.id;

      const messages = await getConversationMessages({
        current_user_id,
        user_id,
      });

      await markConversationRead({
        current_user_id,
        sender_id: user_id,
      });

      res.json({
        success: true,
        data: messages,
        count: messages.length,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

 async getChatList(req, res) {
    try {
      const userId = req.user.id;
      
      // Ek hi query mein sab kuch
      const [conversations] = await db.query(
        `SELECT 
          DISTINCT
          CASE 
            WHEN c.sender_id = ? THEN c.receiver_id
            ELSE c.sender_id
          END AS other_user_id,
          u.full_name,
          u.contact_number,
          u.age,
          u.gender,
          u.blood_group,
          (
            SELECT MAX(appointment_date) 
            FROM appointments 
            WHERE patient_id = u.id OR doctor_id = u.id
          ) AS last_visit,
          (
            SELECT message 
            FROM chat_messages 
            WHERE (sender_id = ? AND receiver_id = u.id)
               OR (sender_id = u.id AND receiver_id = ?)
            ORDER BY created_at DESC LIMIT 1
          ) AS last_message
        FROM chat_messages c
        JOIN users u ON u.id = CASE 
          WHEN c.sender_id = ? THEN c.receiver_id
          ELSE c.sender_id
        END
        WHERE c.sender_id = ? OR c.receiver_id = ?
        GROUP BY other_user_id`,
        [userId, userId, userId, userId, userId, userId]
      );

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getUnreadCount(req, res) {
    try {
      const unreadCount = await getUnreadCountForUser(req.user.id);

      res.json({
        success: true,
        unread_count: unreadCount,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async deleteMessage(req, res) {
    try {
      const { message_id } = req.params;
      const affectedRows = await deleteMessageForUser({
        message_id,
        user_id: req.user.id,
      });

      if (affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Message not found",
        });
      }

      res.json({
        success: true,
        message: "Message deleted",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }

  async getDoctors(req, res) {
    try {
      const doctors = await getDoctors();

      res.json({
        success: true,
        data: doctors,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
}

export default new ChatController();
