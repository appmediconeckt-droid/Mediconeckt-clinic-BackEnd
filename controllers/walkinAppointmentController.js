import db from "../config/db.js";
import bcrypt from "bcryptjs";

const ensureWalkinDoctorColumn = async () => {
  const [columns] = await db.query(
    `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'walkin_appointments'
      AND COLUMN_NAME = 'doctor_id'
    `
  );

  if (columns.length === 0) {
    await db.query(
      `
      ALTER TABLE walkin_appointments
      ADD COLUMN doctor_id INT NULL AFTER patient_id
      `
    );
  }
};

export const createWalkinAppointment = async (
  req,
  res
) => {
  try {
    await ensureWalkinDoctorColumn();

    if (req.user.role?.toLowerCase() !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create walk-in appointments",
      });
    }

    const {
      patient_name,
      phone_number,
      gender,
      symptoms,
      status,
    } = req.body;
    const appointmentStatus = (
      status || "booked"
    ).toLowerCase();
    const validStatuses = [
      "booked",
      "cancelled",
      "completed",
    ];

    if (!patient_name || !phone_number || !symptoms) {
      return res.status(400).json({
        success: false,
        message:
          "patient_name, phone_number and symptoms are required",
      });
    }

    if (!validStatuses.includes(appointmentStatus)) {
      return res.status(400).json({
        success: false,
        message:
          "status must be booked, cancelled or completed",
      });
    }

    let finalPatientId;
    const [existingPatients] = await db.query(
      `
      SELECT id
      FROM users
      WHERE contact_number=? AND role='patient'
      LIMIT 1
      `,
      [phone_number]
    );

    if (existingPatients.length > 0) {
      finalPatientId = existingPatients[0].id;
    } else {
      const generatedEmail = `walkin-${phone_number}-${Date.now()}@mediconeckt.local`;
      const generatedPassword = await bcrypt.hash(
        `walkin-${phone_number}`,
        10
      );

      const [newPatient] = await db.query(
        `
        INSERT INTO users
        (
          role,
          full_name,
          email,
          contact_number,
          password,
          gender,
          email_verified,
          phone_verified
        )
        VALUES (?, ?, ?, ?, ?, ?, 1, 1)
        `,
        [
          "patient",
          patient_name,
          generatedEmail,
          phone_number,
          generatedPassword,
          gender || null,
        ]
      );

      finalPatientId = newPatient.insertId;
    }

    const [patient] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id=? AND role='patient'
      `,
      [finalPatientId]
    );

    if (patient.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    const [result] = await db.query(
      `
      INSERT INTO walkin_appointments
      (
        patient_id,
        doctor_id,
        gender,
        symptoms,
        appointment_status
      )
      VALUES (?,?,?,?,?)
      `,
      [
        finalPatientId,
        req.user.id,
        gender,
        symptoms,
        appointmentStatus,
      ]
    );

    res.status(201).json({
      success: true,
      message:
        "Walk-in appointment created",
      id: result.insertId,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//get all walk-in appointments

export const getWalkinAppointments =
  async (req, res) => {
    try {
      await ensureWalkinDoctorColumn();

      const queryParams = [];
      let doctorFilter = "";

      if (req.user.role?.toLowerCase() === "doctor") {
        doctorFilter = "WHERE wa.doctor_id = ?";
        queryParams.push(req.user.id);
      } else if (req.query.doctor_id) {
        doctorFilter = "WHERE wa.doctor_id = ?";
        queryParams.push(req.query.doctor_id);
      }

      const [appointments] =
        await db.query(`
          SELECT
            wa.*,

            u.full_name,
            u.contact_number,
            u.email,
            d.full_name AS doctor_name

          FROM walkin_appointments wa

          INNER JOIN users u
          ON wa.patient_id = u.id

          LEFT JOIN users d
          ON wa.doctor_id = d.id

          ${doctorFilter}

          ORDER BY wa.id DESC
        `, queryParams);

      const [[stats]] = await db.query(`
        SELECT
          COUNT(*) AS total,

          SUM(
            appointment_status='booked'
          ) AS booked,

          SUM(
            appointment_status='cancelled'
          ) AS cancelled,

          SUM(
            appointment_status='completed'
          ) AS completed

        FROM walkin_appointments
        ${doctorFilter.replace("wa.", "")}
      `, queryParams);

      res.status(200).json({
        success: true,
        stats,
        data: appointments,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  //get walk-in appointment by id

  export const getWalkinAppointmentById =
  async (req, res) => {
    try {
      await ensureWalkinDoctorColumn();

      const { id } = req.params;
      const queryParams = [id];
      let doctorFilter = "";

      if (req.user.role?.toLowerCase() === "doctor") {
        doctorFilter = "AND wa.doctor_id = ?";
        queryParams.push(req.user.id);
      }

      const [rows] = await db.query(`
        SELECT
          wa.*,

          u.full_name,
          u.contact_number,
          u.email,
          d.full_name AS doctor_name

        FROM walkin_appointments wa

        INNER JOIN users u
        ON wa.patient_id = u.id

        LEFT JOIN users d
        ON wa.doctor_id = d.id

        WHERE wa.id=?
        ${doctorFilter}
      `, queryParams);

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message:
            "Appointment not found",
        });
      }

      res.status(200).json({
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

  //update walk-in appointment status

  export const updateWalkinAppointment =
  async (req, res) => {
    try {
      await ensureWalkinDoctorColumn();

      const { id } = req.params;

      const fields = [];
      const values = [];
      const allowedFields = [
        "gender",
        "symptoms",
      ];

      Object.keys(req.body).forEach(
        (key) => {
          if (!allowedFields.includes(key)) {
            return;
          }

          fields.push(`${key}=?`);
          values.push(req.body[key]);
        }
      );

      if (req.body.status) {
        const appointmentStatus = req.body.status.toLowerCase();
        const validStatuses = [
          "booked",
          "cancelled",
          "completed",
        ];

        if (!validStatuses.includes(appointmentStatus)) {
          return res.status(400).json({
            success: false,
            message:
              "status must be booked, cancelled or completed",
          });
        }

        fields.push("appointment_status=?");
        values.push(appointmentStatus);
      }

      if (fields.length === 0) {
        return res.status(400).json({
          success: false,
          message: "No valid fields provided for update",
        });
      }

      values.push(id);
      let doctorFilter = "";

      if (req.user.role?.toLowerCase() === "doctor") {
        doctorFilter = "AND doctor_id=?";
        values.push(req.user.id);
      }

      const [result] = await db.query(
        `
        UPDATE walkin_appointments
        SET ${fields.join(",")}
        WHERE id=?
        ${doctorFilter}
        `,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Appointment updated successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };

  //delete walk-in appointment

  export const deleteWalkinAppointment =
  async (req, res) => {
    try {
      await ensureWalkinDoctorColumn();

      const { id } = req.params;
      const values = [id];
      let doctorFilter = "";

      if (req.user.role?.toLowerCase() === "doctor") {
        doctorFilter = "AND doctor_id=?";
        values.push(req.user.id);
      }

      const [result] = await db.query(
        `
        DELETE FROM walkin_appointments
        WHERE id=?
        ${doctorFilter}
        `,
        values
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: "Appointment not found",
        });
      }

      res.status(200).json({
        success: true,
        message:
          "Appointment deleted successfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  };
