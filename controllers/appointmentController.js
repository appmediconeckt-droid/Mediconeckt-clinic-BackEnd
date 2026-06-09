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

    const appointmentNo =
      "APT" + Date.now();

    const [tokenResult] = await db.query(
      `SELECT COUNT(*) AS total
       FROM appointments
       WHERE doctor_id=?
       AND appointment_date=?`,
      [doctor_id, appointment_date]
    );

    const tokenNumber =
      tokenResult[0].total + 1;

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
        payment_method
      )
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
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
  // UPDATE APPOINTMENT
  export const updateAppointment =
  async (req, res) => {
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
        message:
          "Appointment updated",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };

  // DELETE APPOINTMENT
  export const deleteAppointment =
  async (req, res) => {
    try {
      const { id } = req.params;

      await db.query(
        "DELETE FROM appointments WHERE id=?",
        [id]
      );

      res.json({
        success: true,
        message:
          "Appointment deleted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  };