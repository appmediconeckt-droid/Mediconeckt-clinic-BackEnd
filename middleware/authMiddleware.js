import jwt from "jsonwebtoken";
import db from "../config/db.js";

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authorization token required",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.session_id) {
      const [sessions] = await db.query(
        `
        SELECT id
        FROM user_device_sessions
        WHERE id=? AND user_id=? AND device_id=? AND is_active=1
        LIMIT 1
        `,
        [decoded.session_id, decoded.id, decoded.device_id]
      );

      if (sessions.length === 0) {
        return res.status(401).json({
          success: false,
          message:
            "Session expired because this user logged in on another device",
        });
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        error.code === "ER_NO_SUCH_TABLE"
          ? "Device session table not found. Please login again."
          : "Invalid or expired token",
    });
  }
};
