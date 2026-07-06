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
      shift_time, 
        shift_start_time, 
        shift_end_time,
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
         shift_time, 
          shift_start_time,
            shift_end_time,
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
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
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
        shift_time || null,
          shift_start_time || null,
            shift_end_time || null,
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

let profileQrCode = null;
let appointmentQrCode = null;
let profileQrUrl = null;
let appointmentQrUrl = null;

if (role === "doctor") {
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  profileQrUrl = `${FRONTEND_URL}/doctor-details/${userId}`;
  appointmentQrUrl = `${FRONTEND_URL}/walk-in-appointment`;

  profileQrCode = await QRCode.toDataURL(profileQrUrl);
  appointmentQrCode = await QRCode.toDataURL(appointmentQrUrl);

  await db.query(
    `
    UPDATE users 
    SET 
      profile_qr_code = ?,
      appointment_qr_code = ?,
      profile_qr_url = ?,
      appointment_qr_url = ?
    WHERE id = ?
    `,
    [
      profileQrCode,
      appointmentQrCode,
      profileQrUrl,
      appointmentQrUrl,
      userId,
    ]
  );
}


return res.status(201).json({
  success: true,
  message:
    role === "doctor"
      ? "Doctor registered successfully with QR codes"
      : "User registered successfully",
  userId,
  profileQrCode,
  appointmentQrCode,
  profileQrUrl,
  appointmentQrUrl,
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
        profile_qr_code,
        appointment_qr_code,
        profile_qr_url,
        appointment_qr_url
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


export const getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db.query(
      `
      SELECT 
        *
      FROM users
      WHERE id = ?
      `,
      [id]
    );

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "User profile fetched successfully",
      data: user[0],
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      full_name,
      contact_number,
      speciality,

      qualification,
      experience,
      languages,
      position,
      board_certification,

      about_doctor,
      expertise,
      awards,
      research_focus,

      medical_degree,
      residency,
      fellowship,
      special_training,

      primary_specialties,
      all_conditions,

      primary_hospital,
      hospital_address,
      google_map_link,
      all_hospitals,

      video_visits,
      today_available,
      online_consultation,
      doctor_location,
      accepts_new_patients,
      consultation_hours,

      initial_consultation_fee,
      follow_up_visit_fee,
      insurance_accepted,

      accepted_insurances,
      insurance_note,
    } = getRequestBody(req);

    const [doctor] = await db.query(
      "SELECT id, role FROM users WHERE id = ?",
      [id]
    );


    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    console.log("REQ BODY:", req.body);
console.log("REQ FILE:", req.file);

    // if (doctor[0].role !== "doctor") {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Only doctor profile can be updated",
    //   });
    // }
   const profile_pic = req.file
  ? `uploads/${req.file.filename}`
  : null;

    await db.query(
      `
      UPDATE users SET
        full_name = COALESCE(?, full_name),
        contact_number = COALESCE(?, contact_number),
        speciality = COALESCE(?, speciality),

        qualification = COALESCE(?, qualification),
        experience = COALESCE(?, experience),
        languages = COALESCE(?, languages),
        profile_pic = COALESCE(?, profile_pic),
        position = COALESCE(?, position),
        board_certification = COALESCE(?, board_certification),

        about_doctor = COALESCE(?, about_doctor),
        expertise = COALESCE(?, expertise),
        awards = COALESCE(?, awards),
        research_focus = COALESCE(?, research_focus),

        medical_degree = COALESCE(?, medical_degree),
        residency = COALESCE(?, residency),
        fellowship = COALESCE(?, fellowship),
        special_training = COALESCE(?, special_training),

        primary_specialties = COALESCE(?, primary_specialties),
        all_conditions = COALESCE(?, all_conditions),

        primary_hospital = COALESCE(?, primary_hospital),
        hospital_address = COALESCE(?, hospital_address),
        google_map_link = COALESCE(?, google_map_link),
        all_hospitals = COALESCE(?, all_hospitals),

        video_visits = COALESCE(?, video_visits),
        today_available = COALESCE(?, today_available),
        online_consultation = COALESCE(?, online_consultation),
        doctor_location = COALESCE(?, doctor_location),
        accepts_new_patients = COALESCE(?, accepts_new_patients),
        consultation_hours = COALESCE(?, consultation_hours),

        initial_consultation_fee = COALESCE(?, initial_consultation_fee),
        follow_up_visit_fee = COALESCE(?, follow_up_visit_fee),
        insurance_accepted = COALESCE(?, insurance_accepted),

        accepted_insurances = COALESCE(?, accepted_insurances),
        insurance_note = COALESCE(?, insurance_note)
      WHERE id = ?
      `,
      [
        full_name ?? null,
        contact_number ?? null,
        speciality ?? null,

        qualification ?? null,
        experience ?? null,
        languages ?? null,
         profile_pic,
        position ?? null,
        board_certification ?? null,

        about_doctor ?? null,
        expertise ?? null,
        awards ?? null,
        research_focus ?? null,

        medical_degree ?? null,
        residency ?? null,
        fellowship ?? null,
        special_training ?? null,

        primary_specialties ?? null,
        all_conditions ?? null,

        primary_hospital ?? null,
        hospital_address ?? null,
        google_map_link ?? null,
        all_hospitals ?? null,

        video_visits ?? null,
        today_available ?? null,
        online_consultation ?? null,
        doctor_location ?? null,
        accepts_new_patients ?? null,
        consultation_hours ?? null,

        initial_consultation_fee ?? null,
        follow_up_visit_fee ?? null,
        insurance_accepted ?? null,

        accepted_insurances ?? null,
        insurance_note ?? null,

        id,
      ]
    );

   return res.status(200).json({
  success: true,
  message: "Doctor profile updated successfully",
  profile_pic,
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
        role,
      device_id,
      device_name,
      device_verified,
      device_verification_code,
    } = getRequestBody(req);

    if (!email || !password || !role || !device_id) {
      return res.status(400).json({
        success: false,
        message: "email, password, role and device_id are required",
      });
    }

    const [users] = await db.query(
      "SELECT * FROM users WHERE email=? AND role=?",
      [email , role]
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
      shift,
      shift_time , 
      shift_start_time,
      shift_end_time,
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

 const transformedUsers = users.map(user => {
      // If shift_start_time and shift_end_time exist in DB, use them
      // Otherwise parse from shift_time
      let shiftStartTime = user.shift_start_time || null;
      let shiftEndTime = user.shift_end_time || null;
      
      // If shift_start_time/shift_end_time not in DB but shift_time exists, parse it
      if ((!shiftStartTime || !shiftEndTime) && user.shift_time) {
        const timeParts = user.shift_time.split('-');
        if (timeParts.length === 2) {
          shiftStartTime = timeParts[0].trim();
          shiftEndTime = timeParts[1].trim();
        }
      }

       return {
        ...user,
        shiftStartTime,
        shiftEndTime,
        shift_time: user.shift_time // Keep original for compatibility
      };
    });

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

    const user = users[0];
    
    // Transform shift time data
    let shiftStartTime = user.shift_start_time || null;
    let shiftEndTime = user.shift_end_time || null;
    
    // If separate fields not in DB but shift_time exists, parse it
    if ((!shiftStartTime || !shiftEndTime) && user.shift_time) {
      const timeParts = user.shift_time.split('-');
      if (timeParts.length === 2) {
        shiftStartTime = timeParts[0].trim();
        shiftEndTime = timeParts[1].trim();
      }
    }
    
    // Add transformed fields to response
    user.shiftStartTime = shiftStartTime;
    user.shiftEndTime = shiftEndTime;
    
    delete user.password;

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
// export const updateUser = async (
//   req,
//   res
// ) => {
//   try {
//     const { id } = req.params;
//     const body = getRequestBody(req);
//     const fieldAliases = {
//       name: "full_name",
//       fullName: "full_name",
//       fullname: "full_name",
//       phone: "contact_number",
//       phone_number: "contact_number",
//       mobile: "contact_number",
//       emailVerified: "email_verified",
//       phoneVerified: "phone_verified",
//       nurseId: "staff_id",
//       staffId: "staff_id",
//       employee_id: "staff_id",
//       licenseNumber: "nursing_license",
//       license_number: "nursing_license",
//       ward: "assigned_ward",
//       experience: "years_of_experience",
//       assistantId: "assistant_id",
//       technicianId: "technician_id",
//       supervisorId: "supervisor_id",
//       managerId: "manager_id",
//       billingId: "billing_id",
//       labType: "lab_type",
//       assignedArea: "assigned_area",
//       teamSize: "team_size",
//       employeesUnder: "employees_under",
//       budgetResponsibility: "budget_responsibility",
//       softwareExpertise: "software_expertise",
//     };
//     const ignoredFields = new Set([
//       "id",
//       "userId",
//       "success",
//       "message",
//       "status",
//       "createdAt",
//       "updatedAt",
//       "lastLogin",
//       "created_at",
//       "updated_at",
//       "last_login",
//     ]);
//     const allowedFields = new Set([
//       "role",
//       "full_name",
//       "email",
//       "contact_number",
//       "speciality",
//       "gender",
//       "date_of_birth",
//       "age",
//       "address",
//       "blood_group",
//       "height_cm",
//       "allergies",
//       "medical_conditions",
//       "current_medications",
//       "staff_id",
//       "nursing_license",
//       "shift",
//       "assigned_ward",
//       "years_of_experience",
//       "qualifications",
//       "email_verified",
//       "phone_verified",
//       "assistant_id",
//       "department",
//       "supervisor",
//       "technician_id",
//       "lab_type",
//       "certifications",
//       "housekeeping_staff_id",
//       "assigned_area",
//       "housekeeping_supervisor",
//       "supervisor_id",
//       "team_size",
//       "responsibilities",
//       "manager_id",
//       "employees_under",
//       "budget_responsibility",
//       "billing_id",
//       "software_expertise",
//     ]);

//     const fields = [];
//     const values = [];
//     const invalidFields = [];
//     const normalizedBody = {};

//     Object.keys(body).forEach((key) => {
//       if (ignoredFields.has(key)) {
//         return;
//       }

//       const column = fieldAliases[key] || key;

//       if (!allowedFields.has(column)) {
//         invalidFields.push(key);
//         return;
//       }

//       normalizedBody[column] = body[key];
//     });

//     if (invalidFields.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid field(s): ${invalidFields.join(", ")}`,
//       });
//     }

//     Object.entries(normalizedBody).forEach(([key, value]) => {
//       fields.push(`${key}=?`);
//       values.push(value);
//     });

//     if (fields.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message:
//           "No fields provided for update",
//       });
//     }

//     values.push(id);

//     await db.query(
//       `
//       UPDATE users
//       SET ${fields.join(",")}
//       WHERE id=?
//       `,
//       values
//     );

//     res.status(200).json({
//       success: true,
//       message: "User updated successfully",
//     });
//   } catch (error) {
//     sendError(res, error);
//   }
// };


// ===============================
// UPDATE USER
// ===============================
export const updateUser = async (req, res) => {
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
      shiftTime: "shift_time",
      shift_time: "shift_time",
      shiftStartTime: "shift_start_time",
      shift_start_time: "shift_start_time",
      shiftEndTime: "shift_end_time",
      shift_end_time: "shift_end_time",
      shiftStart: "shift_start_time",
      shiftEnd: "shift_end_time",
    };
    
    const ignoredFields = new Set([
      "id", "userId", "success", "message", "status",
      "createdAt", "updatedAt", "lastLogin",
      "created_at", "updated_at", "last_login",
      "password", "confirmPassword"
    ]);
    
    const allowedFields = new Set([
      "role", "full_name", "email", "contact_number", "speciality",
      "gender", "date_of_birth", "age", "address", "blood_group",
      "height_cm", "allergies", "medical_conditions", "current_medications",
      "staff_id", "nursing_license", "shift", "shift_time",
      "shift_start_time", "shift_end_time",  // ✅ ADD THESE
      "assigned_ward", "years_of_experience", "qualifications",
      "email_verified", "phone_verified", "assistant_id", "department",
      "supervisor", "technician_id", "lab_type", "certifications",
      "housekeeping_staff_id", "assigned_area", "housekeeping_supervisor",
      "supervisor_id", "team_size", "responsibilities", "manager_id",
      "employees_under", "budget_responsibility", "billing_id", "software_expertise"
    ]);

    const fields = [];
    const values = [];
    const invalidFields = [];
    const normalizedBody = {};

    console.log("Update request body:", body);

    Object.keys(body).forEach((key) => {
      if (ignoredFields.has(key)) return;

      const column = fieldAliases[key] || key;

      if (!allowedFields.has(column)) {
        invalidFields.push(key);
        return;
      }

      if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
        normalizedBody[column] = body[key];
      }
    });

    // If both shift_start_time and shift_end_time are provided, also update shift_time for compatibility
    if (normalizedBody.shift_start_time && normalizedBody.shift_end_time) {
      normalizedBody.shift_time = `${normalizedBody.shift_start_time}-${normalizedBody.shift_end_time}`;
    }

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid field(s): ${invalidFields.join(", ")}`,
        allowed_fields: Array.from(allowedFields),
      });
    }

    Object.entries(normalizedBody).forEach(([key, value]) => {
      fields.push(`${key}=?`);
      values.push(value);
    });

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields provided for update",
      });
    }

    values.push(id);

    console.log("Update query:", `UPDATE users SET ${fields.join(",")} WHERE id=?`);
    console.log("Update values:", values);

    await db.query(`UPDATE users SET ${fields.join(",")} WHERE id=?`, values);

    // Fetch updated user
    const [updatedUser] = await db.query("SELECT * FROM users WHERE id=?", [id]);
    
    if (updatedUser.length > 0) {
      const user = updatedUser[0];
      
      // Transform response to include shiftStartTime and shiftEndTime
      let shiftStartTime = user.shift_start_time;
      let shiftEndTime = user.shift_end_time;
      
      if ((!shiftStartTime || !shiftEndTime) && user.shift_time) {
        const timeParts = user.shift_time.split('-');
        if (timeParts.length === 2) {
          shiftStartTime = timeParts[0].trim();
          shiftEndTime = timeParts[1].trim();
        }
      }
      
      user.shiftStartTime = shiftStartTime;
      user.shiftEndTime = shiftEndTime;
      delete user.password;
      
      res.status(200).json({
        success: true,
        message: "User updated successfully",
        data: user,
      });
    } else {
      res.status(200).json({
        success: true,
        message: "User updated successfully",
      });
    }
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
