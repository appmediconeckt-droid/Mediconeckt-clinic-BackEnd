import express from 'express';
import chatController from '../controllers/chatController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Sabse pehle auth middleware lagega
router.use(protect);


// Chat endpoints
router.post('/send', chatController.sendMessage);                           // Send message
router.post('/ai/send', chatController.sendAiMessage);                      // Send message to AI
router.get('/conversation/:user_id', chatController.getConversation);      // Get chat with specific user
router.get('/list', chatController.getChatList);                           // Get all chat list
router.get('/unread', chatController.getUnreadCount);                      // Get unread count
router.delete('/message/:message_id', chatController.deleteMessage);       // Delete message
router.get('/doctors', chatController.getDoctors);                         // Get all doctors

export default router;
