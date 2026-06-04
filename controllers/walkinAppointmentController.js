import db from "../config/db.js";

export const createWalkinAppointment = async (
  req,
  res
) => {
  try {
    const {
      patient_id,
      gender,
      symptoms,
    } = req.body;

    if (!patient_id || !symptoms) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing",
      });
    }

    const [patient] = await db.query(
      `
      SELECT id
      FROM users
      WHERE id=? AND role='patient'
      `,
      [patient_id]
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
        gender,
        symptoms
      )
      VALUES (?,?,?)
      `,
      [
        patient_id,
        gender,
        symptoms,
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
      const [appointments] =
        await db.query(`
          SELECT
            wa.*,

            u.full_name,
            u.contact_number,
            u.email

          FROM walkin_appointments wa

          INNER JOIN users u
          ON wa.patient_id = u.id

          ORDER BY wa.id DESC
        `);

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
      `);

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
      const { id } = req.params;

      const [rows] = await db.query(`
        SELECT
          wa.*,

          u.full_name,
          u.contact_number,
          u.email

        FROM walkin_appointments wa

        INNER JOIN users u
        ON wa.patient_id = u.id

        WHERE wa.id=?
      `,[id]);

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
      const { id } = req.params;

      const fields = [];
      const values = [];

      Object.keys(req.body).forEach(
        (key) => {
          fields.push(`${key}=?`);
          values.push(req.body[key]);
        }
      );

      values.push(id);

      await db.query(
        `
        UPDATE walkin_appointments
        SET ${fields.join(",")}
        WHERE id=?
        `,
        values
      );

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
      const { id } = req.params;

      await db.query(
        `
        DELETE FROM walkin_appointments
        WHERE id=?
        `,
        [id]
      );

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