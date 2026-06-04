import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";


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

    } = req.body;

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
        housekeeping_supervisor 

        supervisor_id,
        team_size,
        responsibilities,

        manager_id,
        employees_under,
        budget_responsibility,

        billing_id,
        software_expertise,
      )
      VALUES
      (
        ?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,
        ?,?,?,?
        ?,?,?,
        ?,?,?, 
        ?,?,?,
        ?,?,
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

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// ===============================
// LOGIN
// ===============================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

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

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    delete user.password;

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user,
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
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

    const fields = [];
    const values = [];

    Object.keys(req.body).forEach((key) => {
      fields.push(`${key}=?`);
      values.push(req.body[key]);
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};