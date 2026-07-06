import db from "../config/db.js";

// CREATE APPOINTMENT
export const createAppointment = async (req, res) => {
  try {
    const {
      patient_id,
      doctor_id,
      clinic_id,
      consultation_mode,
      appointment_date,
      appointment_time,
      consultation_fee,
      payment_method,
    } = req.body;

    const appointmentNo = "APT" + Date.now();

    const [tokenResult] = await db.query(
      `SELECT COUNT(*) AS total
       FROM appointments
       WHERE doctor_id=?
       AND appointment_date=?`,
      [doctor_id, appointment_date]
    );

    const tokenNumber = tokenResult[0].total + 1;

    const [result] = await db.query(
      `INSERT INTO appointments
      (
        appointment_no,
        patient_id,
        doctor_id,
        clinic_id,
        consultation_mode,
        appointment_date,
        appointment_time,
        token_number,
        consultation_fee,
        payment_method,
        appointment_status
      )
      VALUES (?,?,?,?,?,?,?,?,?,?, 'scheduled')`,
      [
        appointmentNo,
        patient_id,
        doctor_id,
        clinic_id,
        consultation_mode,
        appointment_date,
        appointment_time,
        tokenNumber,
        consultation_fee,
        payment_method,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Appointment booked",
      appointmentId: result.insertId,
      tokenNumber,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL APPOINTMENTS
export const getAppointments = async (req, res) => {
  try {
    const {
      doctor_id,
      patient_id,
      appointment_status,
    } = req.query;

    let query = `
      SELECT
      a.*,
      p.full_name AS patient_name,
      p.contact_number AS patient_phone,
      d.full_name AS doctor_name,
      d.contact_number AS doctor_phone,
      d.age AS doctor_age,
      p.age AS patient_age,
      p.gender AS patient_gender,
      d.gender AS doctor_gender,
      p.blood_group AS patient_blood_group,
      d.blood_group AS doctor_blood_group,
      c.clinic_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      JOIN clinics c ON a.clinic_id = c.id
      WHERE 1=1
    `;

    let params = [];

    if (doctor_id) {
      query += " AND a.doctor_id = ?";
      params.push(doctor_id);
    }

    if (patient_id) {
      query += " AND a.patient_id = ?";
      params.push(patient_id);
    }

    if (appointment_status) {
      query += " AND a.appointment_status = ?";
      params.push(appointment_status);
    }

    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET APPOINTMENT BY ID
export const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `
      SELECT
      a.*,
      p.full_name AS patient_name,
      p.contact_number AS patient_phone,
      p.age AS patient_age,
      p.gender AS patient_gender,
      d.full_name AS doctor_name,
      d.contact_number AS doctor_phone,
      d.age AS doctor_age,
      d.gender AS doctor_gender,
      c.clinic_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      JOIN clinics c ON a.clinic_id = c.id
      WHERE a.id = ?
    `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET APPOINTMENTS BY PATIENT ID
export const getAppointmentsByPatientId = async (req, res) => {
  try {
    const { patientId } = req.params;

    const [rows] = await db.query(
      `
      SELECT
        a.*,
        d.full_name AS doctor_name,
        d.contact_number AS doctor_phone,
        d.speciality AS doctor_speciality,
        c.clinic_name
      FROM appointments a
      JOIN users d ON a.doctor_id = d.id
      JOIN clinics c ON a.clinic_id = c.id
      WHERE a.patient_id = ?
      ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `,
      [patientId]
    );

    res.json({
      success: true,
      count: rows.length,
      data: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== NEW: NURSE CHECK-IN & ADD VITAL SIGNS ==========
export const nurseCheckIn = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      temperature,
      heart_rate,
      blood_pressure,
      respiratory_rate,
      oxygen_saturation,
      blood_glucose,
      pain_level,
      weight,
      clinical_notes,
      nurse_name,
      nurse_id
    } = req.body;

    // Check if appointment exists
    const [appointment] = await db.query(
      `SELECT * FROM appointments WHERE id = ?`,
      [id]
    );

    if (appointment.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if appointment is already checked in
    if (appointment[0].appointment_status === 'checked_in') {
      return res.status(400).json({
        success: false,
        message: "Appointment already checked in",
      });
    }

    // Check if appointment is for today
    const today = new Date().toISOString().split('T')[0];
    if (appointment[0].appointment_date !== today) {
      return res.status(400).json({
        success: false,
        message: "Cannot check in for past or future appointments",
      });
    }

    // Update appointment with vital signs
    const [result] = await db.query(
      `
      UPDATE appointments 
      SET 
        temperature = ?,
        heart_rate = ?,
        blood_pressure = ?,
        respiratory_rate = ?,
        oxygen_saturation = ?,
        blood_glucose = ?,
        pain_level = ?,
        weight = ?,
        clinical_notes = ?,
        nurse_name = ?,
        nurse_id = ?,
        appointment_status = 'checked_in',
        checked_in_at = NOW()
      WHERE id = ?
      `,
      [
        temperature || null,
        heart_rate || null,
        blood_pressure || null,
        respiratory_rate || null,
        oxygen_saturation || null,
        blood_glucose || null,
        pain_level || null,
        weight || null,
        clinical_notes || null,
        nurse_name || null,
        nurse_id || null,
        id
      ]
    );

    // Get updated appointment with patient details
    const [updatedAppointment] = await db.query(
      `
      SELECT 
        a.*,
        p.full_name AS patient_name,
        p.contact_number AS patient_phone,
        p.age AS patient_age,
        p.gender AS patient_gender,
        d.full_name AS doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.id = ?
      `,
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Patient checked in successfully with vital signs",
      data: updatedAppointment[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== NEW: GET TODAY'S APPOINTMENTS (NURSE VIEW) ==========
export const getTodayAppointments = async (req, res) => {
  try {
    const { status } = req.query; // scheduled, checked_in, in_progress, completed
    const today = new Date().toISOString().split('T')[0];

    let query = `
      SELECT 
        a.id,
        a.appointment_no,
        a.token_number,
        a.appointment_time,
        a.appointment_status,
        a.temperature,
        a.heart_rate,
        a.blood_pressure,
        a.respiratory_rate,
        a.oxygen_saturation,
        a.blood_glucose,
        a.pain_level,
        a.weight,
        a.checked_in_at,
        p.full_name AS patient_name,
        p.age AS patient_age,
        p.gender AS patient_gender,
        p.contact_number AS patient_phone,
        d.full_name AS doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.appointment_date = ?
    `;

    let params = [today];

    if (status) {
      query += " AND a.appointment_status = ?";
      params.push(status);
    }

    query += " ORDER BY a.token_number ASC";

    const [rows] = await db.query(query, params);

    res.json({
      success: true,
      count: rows.length,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ========== NEW: SEARCH APPOINTMENT BY PATIENT NAME/PHONE ==========
export const searchAppointment = async (req, res) => {
  try {
    const { query } = req.query;
    const today = new Date().toISOString().split('T')[0];

    if (!query) {
      return res.status(400).json({
        success: false,
        message: "Search query is required"
      });
    }

    const [rows] = await db.query(
      `
      SELECT 
        a.id,
        a.appointment_no,
        a.token_number,
        a.appointment_time,
        a.appointment_status,
        a.checked_in_at,
        p.full_name AS patient_name,
        p.age AS patient_age,
        p.gender AS patient_gender,
        p.contact_number AS patient_phone,
        d.full_name AS doctor_name
      FROM appointments a
      JOIN users p ON a.patient_id = p.id
      JOIN users d ON a.doctor_id = d.id
      WHERE a.appointment_date = ?
      AND (p.full_name LIKE ? OR p.contact_number LIKE ?)
      ORDER BY a.token_number ASC
      `,
      [today, `%${query}%`, `%${query}%`]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No appointment found for today with this name/phone"
      });
    }

    res.json({
      success: true,
      data: rows
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE APPOINTMENT (Modified to include status)
export const updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      appointment_date,
      appointment_time,
      consultation_mode,
      payment_method,
      appointment_status,
    } = req.body;

    await db.query(
      `
      UPDATE appointments
      SET
        appointment_date=?,
        appointment_time=?,
        consultation_mode=?,
        payment_method=?,
        appointment_status=?
      WHERE id=?
      `,
      [
        appointment_date,
        appointment_time,
        consultation_mode,
        payment_method,
        appointment_status,
        id,
      ]
    );

    res.json({
      success: true,
      message: "Appointment updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE APPOINTMENT
export const deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM appointments WHERE id=?", [id]);

    res.json({
      success: true,
      message: "Appointment deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};