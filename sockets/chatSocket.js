import jwt from "jsonwebtoken";
import db from "../config/db.js";
import {
  getAiReply,
  getAiUserId,
  markConversationRead,
  saveMessage,
} from "../services/chatService.js";

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const queryToken = socket.handshake.query?.token;

  if (authToken) {
    return authToken.replace("Bearer ", "");
  }

  if (queryToken) {
    return String(queryToken).replace("Bearer ", "");
  }

  return null;
};

const verifySocketUser = async (socket) => {
  const token = getTokenFromSocket(socket);

  if (!token) {
    throw new Error("Authorization token required");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  if (decoded.session_id) {
    const [sessions] = await db.query(
      `SELECT id
       FROM user_device_sessions
       WHERE id=? AND user_id=? AND device_id=? AND is_active=1
       LIMIT 1`,
      [decoded.session_id, decoded.id, decoded.device_id]
    );

    if (sessions.length === 0) {
      throw new Error("Session expired because this user logged in on another device");
    }
  }

  return decoded;
};

export const initializeChatSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      socket.user = await verifySocketUser(socket);
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", (socket) => {
    const userRoom = `user:${socket.user.id}`;
    socket.join(userRoom);

    socket.emit("chat:connected", {
      success: true,
      user_id: socket.user.id,
    });

    socket.on("chat:send", async (payload, callback) => {
      try {
        const { receiver_id, message } = payload || {};

        if (!receiver_id || !message) {
          throw new Error("receiver_id and message are required");
        }

        const newMessage = await saveMessage({
          sender_id: socket.user.id,
          receiver_id,
          message,
        });

        io.to(`user:${receiver_id}`).emit("chat:message", newMessage);
        socket.emit("chat:message", newMessage);

        callback?.({
          success: true,
          data: newMessage,
        });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message,
        });
      }
    });

    socket.on("chat:ai", async (payload, callback) => {
      try {
        const { message } = payload || {};

        if (!message) {
          throw new Error("message is required");
        }

        const aiUserId = await getAiUserId();
        const userMessage = await saveMessage({
          sender_id: socket.user.id,
          receiver_id: aiUserId,
          message,
        });

        socket.emit("chat:message", userMessage);

        const aiReply = await getAiReply(message);
        const aiMessage = await saveMessage({
          sender_id: aiUserId,
          receiver_id: socket.user.id,
          message: aiReply,
        });

        socket.emit("chat:message", aiMessage);

        callback?.({
          success: true,
          data: {
            user_message: userMessage,
            ai_message: aiMessage,
            ai_user_id: aiUserId,
          },
        });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message,
        });
      }
    });

    socket.on("chat:read", async (payload, callback) => {
      try {
        const { sender_id } = payload || {};

        if (!sender_id) {
          throw new Error("sender_id is required");
        }

        await markConversationRead({
          current_user_id: socket.user.id,
          sender_id,
        });

        io.to(`user:${sender_id}`).emit("chat:read", {
          reader_id: socket.user.id,
        });

        callback?.({ success: true });
      } catch (error) {
        callback?.({
          success: false,
          message: error.message,
        });
      }
    });
  });
};
