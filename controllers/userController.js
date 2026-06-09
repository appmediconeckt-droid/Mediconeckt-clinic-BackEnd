import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

const sendError = (res, error) => {
  console.log(error);

  res.status(500).json({
    success: false,
    message:
      error.sqlMessage ||
      error.message ||
      "Server error",
    code: error.code,
  });
};

const getRequestBody = (req) => {
  if (typeof req.body !== "string") {
    return req.body || {};
  }

  try {
    return JSON.parse(req.body);
  } catch {
    return {};
  }
};

const ensureUserDeviceSessionsTable = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS user_device_sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      device_id VARCHAR(255) NOT NULL,
      device_name VARCHAR(255) NULL,
      session_token TEXT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      is_verified TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      logged_out_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_active (user_id, is_active),
      INDEX idx_user_device (user_id, device_id)
    )
  `);
};

const isDeviceVerificationValid = ({
  device_verified,
  device_verification_code,
}) => {
  const staticCode = process.env.DEVICE_LOGIN_OTP || "123456";

  return (
    device_verified === true ||
    device_verified === 1 ||
    device_verified === "1" ||
    device_verified === "true" ||
    device_verification_code === staticCode
  );
};

// ===============================
// REGISTER USER
// ===============================
export const register = async (req, res) => {
  try {
    const {
      role,

      full_name,
      email,
      contact_number,
      password,

      // Doctor
      speciality,

      // Patient
      gender,
      date_of_birth,
      age,
      address,
      blood_group,
      height_cm,
      allergies,
      medical_conditions,
      current_medications,

      // Nurse / Staff
      staff_id,
      nursing_license,
      shift,
      assigned_ward,
      years_of_experience,
      qualifications,
      email_verified,
      phone_verified,


      // Assistant
      assistant_id,
      department,
      supervisor,

      //lab technician
       technician_id,
       lab_type,
       certifications,

       //housekeeping staff
       housekeeping_staff_id,
       assigned_area,
       housekeeping_supervisor,

       //supervisor
         supervisor_id,
         team_size,
        responsibilities,

        //department

        manager_id,
        employees_under,
        budget_responsibility,

        //billing
        billing_id,
        software_expertise,

    } = getRequestBody(req);

    if (
      !role ||
      !full_name ||
      !email ||
      !contact_number ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message:
          "role, full_name, email, contact_number and password are required",
      });
    }

    const [existingUser] = await db.query(
      "SELECT id FROM users WHERE email=?",
      [email]
    );

    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters",
      });
    }

    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    const [result] = await db.query(
      `
      INSERT INTO users
      (
        role,
        full_name,
        email,
        contact_number,
        password,

        speciality,

        gender,
        date_of_birth,
        age,
        address,
        blood_group,
        height_cm,
        allergies,
        medical_conditions,
        current_medications,

        staff_id,
        nursing_license,
        shift,
        assigned_ward,
        years_of_experience,
        qualifications,
        email_verified,
        phone_verified,

        assistant_id,
        department,
        supervisor,

        technician_id,
        lab_type,
        certifications,

        housekeeping_staff_id,
        assigned_area,
        housekeeping_supervisor,

        supervisor_id,
        team_size,
        responsibilities,

        manager_id,
        employees_under,
        budget_responsibility,

        billing_id,
        software_expertise
      )
      VALUES
      (
        ?,?,?,?,?,
        ?,
        ?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,
        ?,?,?,
        ?,?,?,
        ?,?,?,
        ?,?,?,
        ?,?,?,
        ?,?
      )
      `,
      [
        role,
        full_name,
        email,
        contact_number,
        hashedPassword,

        speciality || null,

        gender || null,
        date_of_birth || null,
        age || null,
        address || null,
        blood_group || null,
        height_cm || null,
        allergies || null,
        medical_conditions || null,
        current_medications || null,

        staff_id || null,
        nursing_license || null,
        shift || null,
        assigned_ward || null,
        years_of_experience || null,
        qualifications || null,
        email_verified || 0,
        phone_verified || 0,


        assistant_id || null,
        department || null,
        supervisor || null,

        technician_id || null,
        lab_type || null,
        certifications || null,


        housekeeping_staff_id || null,
        assigned_area || null,
        housekeeping_supervisor || null,

        supervisor_id || null,
        team_size || null,
        responsibilities || null,

        manager_id || null,
        employees_under || null,
        budget_responsibility || null,
        billing_id || null,
        software_expertise || null,
      ]
    );

    const userId = result.insertId;
let qrCode = null;

if (role === "doctor") {
  const qrData = {
    userId,
    role: "doctor",
    full_name,
    email,
    contact_number,
    speciality: speciality || null,
  };

  qrCode = await QRCode.toDataURL(JSON.stringify(qrData));

  await db.query(
    "UPDATE users SET qr_code=? WHERE id=?",
    [qrCode, userId]
  );
}



res.status(201).json({
  success: true,
  message:
    role === "doctor"
      ? "Doctor registered successfully with QR code"
      : "User registered successfully",
  userId,
  qrCode,
});



   res.status(201).json({
  success: true,
  message:
    role === "doctor"
      ? "Doctor registered successfully with QR code"
      : "User registered successfully",
  userId,
  qrCode,
});
  } catch (error) {
    sendError(res, error);
  }
};


export const getDoctorQRById = async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db.query(
      `
      SELECT
        id,
        full_name,
        email,
        role,
        speciality,
        qr_code
      FROM users
      WHERE id = ?
      `,
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user[0].role !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "QR available only for doctors",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Doctor QR fetched successfully",
      data: user[0],
    });
  } catch (error) {
    sendError(res, error);
  }
};




// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const {
      email,
      password,
      device_id,
      device_name,
      device_verified,
      device_verification_code,
    } = getRequestBody(req);

    if (!email || !password || !device_id) {
      return res.status(400).json({
        success: false,
        message: "email, password and device_id are required",
      });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email=?",
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid password",
      });
    }

    await ensureUserDeviceSessionsTable();

    const [activeSessions] = await db.query(
      `
      SELECT id, device_id, device_name
      FROM user_device_sessions
      WHERE user_id=? AND is_active=1
      ORDER BY last_login_at DESC
      LIMIT 1
      `,
      [user.id]
    );

    const activeSession = activeSessions[0];
    const isDifferentDevice =
      activeSession && activeSession.device_id !== device_id;

    if (
      isDifferentDevice &&
      !isDeviceVerificationValid({
        device_verified,
        device_verification_code,
      })
    ) {
      return res.status(403).json({
        success: false,
        message:
          "Device verification required before login on this device",
        requires_device_verification: true,
        previous_device: {
          device_id: activeSession.device_id,
          device_name: activeSession.device_name,
        },
      });
    }

    await db.query(
      `
      UPDATE user_device_sessions
      SET is_active=0, logged_out_at=NOW()
      WHERE user_id=? AND is_active=1
      `,
      [user.id]
    );

    const [sessionResult] = await db.query(
      `
      INSERT INTO user_device_sessions
      (
        user_id,
        device_id,
        device_name,
        is_active,
        is_verified,
        last_login_at
      )
      VALUES (?, ?, ?, 1, ?, NOW())
      `,
      [
        user.id,
        device_id,
        device_name || null,
        isDifferentDevice ? 1 : 0,
      ]
    );

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        session_id: sessionResult.insertId,
        device_id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    delete user.password;

    await db.query(
      `
      UPDATE user_device_sessions
      SET session_token=?
      WHERE id=?
      `,
      [token, sessionResult.insertId]
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      device_session: {
        session_id: sessionResult.insertId,
        device_id,
        device_name: device_name || null,
      },
      user,
    });
  } catch (error) {
    sendError(res, error);
  }
};


// ===============================
// GET ALL USERS
// ===============================
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;

    let query = `
      SELECT
      id,
      role,
      full_name,
      email,
      contact_number,
      speciality,
      gender,
      blood_group,
      created_at
      FROM users
    `;

    const values = [];

    if (role) {
      query += " WHERE role=?";
      values.push(role);
    }

    const [users] = await db.query(
      query,
      values
    );

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    sendError(res, error);
  }
};


// ===============================
// GET USER BY ID
// ===============================
export const getUserById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [users] = await db.query(
      `
      SELECT *
      FROM users
      WHERE id=?
      `,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    delete users[0].password;

    res.status(200).json({
      success: true,
      data: users[0],
    });
  } catch (error) {
    sendError(res, error);
  }
};


// ===============================
// UPDATE USER
// ===============================
export const updateUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const body = getRequestBody(req);
    const fieldAliases = {
      name: "full_name",
      fullName: "full_name",
      fullname: "full_name",
      phone: "contact_number",
      phone_number: "contact_number",
      mobile: "contact_number",
      emailVerified: "email_verified",
      phoneVerified: "phone_verified",
      nurseId: "staff_id",
      staffId: "staff_id",
      employee_id: "staff_id",
      licenseNumber: "nursing_license",
      license_number: "nursing_license",
      ward: "assigned_ward",
      experience: "years_of_experience",
      assistantId: "assistant_id",
      technicianId: "technician_id",
      supervisorId: "supervisor_id",
      managerId: "manager_id",
      billingId: "billing_id",
      labType: "lab_type",
      assignedArea: "assigned_area",
      teamSize: "team_size",
      employeesUnder: "employees_under",
      budgetResponsibility: "budget_responsibility",
      softwareExpertise: "software_expertise",
    };
    const ignoredFields = new Set([
      "id",
      "userId",
      "success",
      "message",
      "status",
      "createdAt",
      "updatedAt",
      "lastLogin",
      "created_at",
      "updated_at",
      "last_login",
    ]);
    const allowedFields = new Set([
      "role",
      "full_name",
      "email",
      "contact_number",
      "speciality",
      "gender",
      "date_of_birth",
      "age",
      "address",
      "blood_group",
      "height_cm",
      "allergies",
      "medical_conditions",
      "current_medications",
      "staff_id",
      "nursing_license",
      "shift",
      "assigned_ward",
      "years_of_experience",
      "qualifications",
      "email_verified",
      "phone_verified",
      "assistant_id",
      "department",
      "supervisor",
      "technician_id",
      "lab_type",
      "certifications",
      "housekeeping_staff_id",
      "assigned_area",
      "housekeeping_supervisor",
      "supervisor_id",
      "team_size",
      "responsibilities",
      "manager_id",
      "employees_under",
      "budget_responsibility",
      "billing_id",
      "software_expertise",
    ]);

    const fields = [];
    const values = [];
    const invalidFields = [];
    const normalizedBody = {};

    Object.keys(body).forEach((key) => {
      if (ignoredFields.has(key)) {
        return;
      }

      const column = fieldAliases[key] || key;

      if (!allowedFields.has(column)) {
        invalidFields.push(key);
        return;
      }

      normalizedBody[column] = body[key];
    });

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid field(s): ${invalidFields.join(", ")}`,
      });
    }

    Object.entries(normalizedBody).forEach(([key, value]) => {
      fields.push(`${key}=?`);
      values.push(value);
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "No fields provided for update",
      });
    }

    values.push(id);

    await db.query(
      `
      UPDATE users
      SET ${fields.join(",")}
      WHERE id=?
      `,
      values
    );

    res.status(200).json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    sendError(res, error);
  }
};


// ===============================
// DELETE USER
// ===============================
export const deleteUser = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM users WHERE id=?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    sendError(res, error);
  }
};


export const changePassword = async (req, res) => {
    try {
        const { 
            user_id,           // User ka ID
            current_password,  // Purana password
            new_password,      // Naya password
            confirm_password   // Confirm naya password
        } = req.body;

        // Validation 1: Check all fields are present
        if (!user_id || !current_password || !new_password || !confirm_password) {
            return res.status(400).json({
                success: false,
                message: "All fields are required: user_id, current_password, new_password, confirm_password"
            });
        }

        // Validation 2: New password and confirm password match
        if (new_password !== confirm_password) {
            return res.status(400).json({
                success: false,
                message: "New password and confirm password do not match"
            });
        }

        // Validation 3: Password length check
        if (new_password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        // Validation 4: Current and new password same nahi hone chahiye
        if (current_password === new_password) {
            return res.status(400).json({
                success: false,
                message: "New password cannot be same as current password"
            });
        }

        // Get user from database
        const [users] = await db.query(
            "SELECT id, password FROM users WHERE id = ?",
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        // Verify current password
        // Agar password hash hai to bcrypt.compare use karein
        // Agar plain text hai to direct compare karein
        let isPasswordValid = false;
        
        // Check if password is hashed (starts with $2b$ or $2a$)
        if (user.password && user.password.startsWith('$2')) {
            // Hashed password
            isPasswordValid = await bcrypt.compare(current_password, user.password);
        } else {
            // Plain text password (for old data)
            isPasswordValid = (current_password === user.password);
        }

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(new_password, 10);

        // Update password in database
        await db.query(
            "UPDATE users SET password = ? WHERE id = ?",
            [hashedPassword, user_id]
        );

        // Optional: Create notification for password change (agar notifications table hai to)
        // Check if notifications table exists
        const [tables] = await db.query("SHOW TABLES LIKE 'notifications'");
        if (tables.length > 0) {
            const notification_no = "PWD" + Date.now();
            await db.query(
                `INSERT INTO notifications (notification_no, user_id, user_role, title, message, type, priority)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [notification_no, user_id, 'patient', "Password Changed Successfully", 
                 "Your password has been changed. If you didn't do this, please contact support immediately.", 
                 "alert", "high"]
            );
        }

        res.status(200).json({
            success: true,
            message: "Password changed successfully"
        });

    } catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ============ VERIFY CURRENT PASSWORD (Helper API) ============
export const verifyPassword = async (req, res) => {
    try {
        const { user_id, password } = req.body;

        if (!user_id || !password) {
            return res.status(400).json({
                success: false,
                message: "user_id and password are required"
            });
        }

        const [users] = await db.query(
            "SELECT password FROM users WHERE id = ?",
            [user_id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        let isValid = false;
        
        if (users[0].password && users[0].password.startsWith('$2')) {
            isValid = await bcrypt.compare(password, users[0].password);
        } else {
            isValid = (password === users[0].password);
        }

        res.status(200).json({
            success: true,
            isValid: isValid
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};
