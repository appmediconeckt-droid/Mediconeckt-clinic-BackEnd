import db from "../config/db.js";

const AI_USER_EMAIL = "ai-assistant@mediconeckt.local";

export const ensureChatMessagesTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      read_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sender_receiver (sender_id, receiver_id),
      INDEX idx_receiver_read (receiver_id, is_read)
    )
  `);
};

export const getMessageById = async (messageId) => {
  const [messages] = await db.execute(
    `SELECT
      cm.*,
      sender.full_name as sender_name,
      receiver.full_name as receiver_name
    FROM chat_messages cm
    LEFT JOIN users sender ON cm.sender_id = sender.id
    LEFT JOIN users receiver ON cm.receiver_id = receiver.id
    WHERE cm.id = ?`,
    [messageId]
  );

  return messages[0] || null;
};

export const saveMessage = async ({ sender_id, receiver_id, message }) => {
  await ensureChatMessagesTable();

  const [result] = await db.execute(
    `INSERT INTO chat_messages (sender_id, receiver_id, message, created_at)
     VALUES (?, ?, ?, NOW())`,
    [sender_id, receiver_id, message]
  );

  return getMessageById(result.insertId);
};

export const getAiUserId = async () => {
  const [users] = await db.execute(
    "SELECT id FROM users WHERE email = ? LIMIT 1",
    [AI_USER_EMAIL]
  );

  if (users.length > 0) {
    return users[0].id;
  }

  const [result] = await db.execute(
    `INSERT INTO users
     (role, full_name, email, contact_number, password, email_verified, phone_verified)
     VALUES (?, ?, ?, ?, ?, 1, 1)`,
    [
      "ai",
      "Mediconeckt AI Assistant",
      AI_USER_EMAIL,
      "0000000000",
      "ai-system-user",
    ]
  );

  return result.insertId;
};

export const getConversationMessages = async ({
  current_user_id,
  user_id,
}) => {
  await ensureChatMessagesTable();

  const [messages] = await db.execute(
    `SELECT
      cm.id,
      cm.sender_id,
      cm.receiver_id,
      cm.message,
      cm.is_read,
      cm.read_at,
      cm.created_at,
      sender.full_name as sender_name,
      receiver.full_name as receiver_name
    FROM chat_messages cm
    LEFT JOIN users sender ON cm.sender_id = sender.id
    LEFT JOIN users receiver ON cm.receiver_id = receiver.id
    WHERE (sender_id = ? AND receiver_id = ?)
       OR (sender_id = ? AND receiver_id = ?)
    ORDER BY cm.created_at ASC`,
    [current_user_id, user_id, user_id, current_user_id]
  );

  return messages;
};

export const markConversationRead = async ({
  current_user_id,
  sender_id,
}) => {
  await ensureChatMessagesTable();

  await db.execute(
    `UPDATE chat_messages
     SET is_read = 1, read_at = NOW()
     WHERE receiver_id = ? AND sender_id = ? AND is_read = 0`,
    [current_user_id, sender_id]
  );
};

export const getChatListForUser = async (user_id) => {
  await ensureChatMessagesTable();

  const [conversations] = await db.execute(
    `SELECT
      u.id as user_id,
      u.full_name as user_name,
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
    [
      user_id,
      user_id,
      user_id,
      user_id,
      user_id,
      user_id,
      user_id,
      user_id,
      user_id,
    ]
  );

  return conversations;
};

export const getUnreadCountForUser = async (user_id) => {
  await ensureChatMessagesTable();

  const [result] = await db.execute(
    `SELECT COUNT(*) as count
     FROM chat_messages
     WHERE receiver_id = ? AND is_read = 0`,
    [user_id]
  );

  return result[0].count;
};

export const deleteMessageForUser = async ({ message_id, user_id }) => {
  await ensureChatMessagesTable();

  const [result] = await db.execute(
    `DELETE FROM chat_messages
     WHERE id = ? AND (sender_id = ? OR receiver_id = ?)`,
    [message_id, user_id, user_id]
  );

  return result.affectedRows;
};

export const getDoctors = async () => {
  const [doctors] = await db.execute(
    `SELECT id, full_name as name, email, role
     FROM users
     WHERE role = 'doctor'`
  );

  return doctors;
};

export const getAiReply = async (message) => {
  if (!process.env.OPENAI_API_KEY) {
    return (
      "AI assistant is not configured yet. Please set OPENAI_API_KEY to enable live AI replies."
    );
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You are Mediconeckt clinic assistant. Help with general clinic, appointment, and navigation questions. Do not provide diagnosis or emergency medical advice.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI response failed with status ${response.status}`);
  }

  const data = await response.json();

  return (
    data.output_text ||
    data.output?.[0]?.content?.[0]?.text ||
    "I could not generate a reply right now."
  );
};
