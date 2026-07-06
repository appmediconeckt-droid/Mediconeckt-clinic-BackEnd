import db from "../config/db.js";


// CREATE CLINIC
export const createClinic = async (req, res) => {
  try {
    console.log("BODY =>", req.body);
    console.log("FILE =>", req.file);

    const {
      clinic_name,
      phone_number,
      location,
    } = req.body;

    if (req.user.role?.toLowerCase() !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Only doctors can create clinics",
      });
    }

    const doctor_id = req.user.id;

    if (
      !clinic_name ||
      !phone_number ||
      !location
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

   const clinic_photo = req.file
  ? `uploads/${req.file.filename}`
  : null;

    const [result] = await db.query(
      `INSERT INTO clinics
      (
        doctor_id,
        clinic_name,
        phone_number,
        location,
        clinic_photo
      )
      VALUES (?,?,?,?,?)`,
      [
        doctor_id,
        clinic_name,
        phone_number,
        location,
        clinic_photo,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Clinic created successfully",
      clinicId: result.insertId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// GET ALL CLINICS
export const getClinics = async (req, res) => {
  try {
    const { doctor_id } = req.query;

    let query = `
      SELECT *
      FROM clinics
      WHERE 1=1
    `;

    let params = [];

    if (doctor_id) {
      query += " AND doctor_id=?";
      params.push(doctor_id);
    }

    const [rows] = await db.query(
      query,
      params
    );

    res.status(200).json({
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



// GET CLINIC BY ID
export const getClinicById = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM clinics WHERE id=?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Clinic not found",
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



// UPDATE CLINIC
export const updateClinic = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      clinic_name,
      phone_number,
      location,
      status,
    } = req.body;

    let clinic_photo = null;

    if (req.file) {
      clinic_photo = `uploads/${req.file.filename}`;
    }

    await db.query(
      `UPDATE clinics
       SET
        clinic_name=?,
        phone_number=?,
        location=?,
        clinic_photo=COALESCE(?, clinic_photo),
        status=COALESCE(?, status)
       WHERE id=?`,
      [
        clinic_name,
        phone_number,
        location,
        clinic_photo,
        status || null,
        id,
      ]
    );

    const [updatedRows] = await db.query(
      "SELECT * FROM clinics WHERE id=?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Clinic updated successfully",
      data: updatedRows[0],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



// DELETE CLINIC
export const deleteClinic = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM clinics WHERE id=?",
      [id]
    );

    res.status(200).json({
      success: true,
      message: "Clinic deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
