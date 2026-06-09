import db from '../config/db.js';

// Create new follow-up
// Create follow-up - patient_id lo
export const createFollowUp = async (req, res) => {
  try {
    const { 
        patient_id,      // ✅ ID lo
        doctor_id,       // ✅ ID lo
        appointment_id,
        follow_up_date, 
        follow_up_time,
        type,
        reason,
        notes,
        status
    } = req.body;

    if (!patient_id || !follow_up_date) {
        return res.status(400).json({ 
            error: 'Patient ID and follow-up date are required' 
        });
    }

    const query = `
        INSERT INTO follow_ups 
        (patient_id, doctor_id, appointment_id, follow_up_date, 
         follow_up_type, reason, notes, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const follow_up_datetime = follow_up_time ? 
        `${follow_up_date} ${follow_up_time}:00` : 
        follow_up_date;

    const [result] = await db.query(query, [
        patient_id,      // ✅ Store ID
        doctor_id,       // ✅ Store ID
        appointment_id,
        follow_up_datetime,
        type,
        reason,
        notes,
        status || 'pending'
    ]);

    res.status(201).json({
        message: 'Follow-up created successfully',
        id: result.insertId
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get all follow-ups - JOIN se name lao
// Get all follow-ups (filter by doctor_id if provided)
export const getAllFollowUps = async (req, res) => {
  try {
    const { doctor_id } = req.query;
    
    let query = `
        SELECT 
            f.*,
            p.full_name as patient_name,
            p.age,
            p.contact_number as phone,
            d.full_name as doctor_name
        FROM follow_ups f
        LEFT JOIN users p ON f.patient_id = p.id
        LEFT JOIN users d ON f.doctor_id = d.id
        WHERE 1=1
    `;
    
    const params = [];
    
    if (doctor_id) {
        query += ` AND f.doctor_id = ?`;
        params.push(doctor_id);
    }
    
    query += ` ORDER BY f.follow_up_date DESC`;
    
    const [results] = await db.query(query, params);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};
// Get single follow-up by ID
export const getFollowUpById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
        SELECT 
            f.*,
            p.full_name as patient_name,
            p.age,
            p.contact_number as phone,
            d.full_name as doctor_name
        FROM follow_ups f
        LEFT JOIN users p ON f.patient_id = p.id
        LEFT JOIN users d ON f.doctor_id = d.id
        WHERE f.id = ?
    `;

    const [results] = await db.query(query, [id]);

    if (results.length === 0) {
        return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json(results[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get today's follow-ups with names
// Get today's follow-ups (filter by doctor_id if provided)
export const getTodayFollowUps = async (req, res) => {
  try {
    const { doctor_id } = req.query; // Get doctor_id from URL query parameter
    
    let query = `
        SELECT 
            f.*,
            p.full_name as patient_name,
            p.age,
            p.contact_number as phone,
            d.full_name as doctor_name
        FROM follow_ups f
        LEFT JOIN users p ON f.patient_id = p.id
        LEFT JOIN users d ON f.doctor_id = d.id
        WHERE DATE(f.follow_up_date) = CURDATE()
    `;
    
    const params = [];
    
    // Agar doctor_id diya hai to filter laga do
    if (doctor_id) {
        query += ` AND f.doctor_id = ?`;
        params.push(doctor_id);
    }
    
    query += ` ORDER BY f.follow_up_date ASC`;
    
    const [results] = await db.query(query, params);
    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Update follow-up
export const updateFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
        patient_id, doctor_id, appointment_id, 
        follow_up_date, follow_up_type, reason, 
        notes, status 
    } = req.body;

    const query = `
        UPDATE follow_ups 
        SET patient_id = ?, doctor_id = ?, appointment_id = ?,
            follow_up_date = ?, follow_up_type = ?, 
            reason = ?, notes = ?, status = ?
        WHERE id = ?
    `;

    const [result] = await db.query(query, [
        patient_id, doctor_id, appointment_id,
        follow_up_date, follow_up_type, reason, 
        notes, status, id
    ]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json({ message: 'Follow-up updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Delete follow-up
export const deleteFollowUp = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM follow_ups WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Follow-up not found' });
    }

    res.json({ message: 'Follow-up deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
};

// Get today's follow-ups
// export const getTodayFollowUps = async (req, res) => {
//   try {
//     const [results] = await db.query('SELECT * FROM follow_ups WHERE follow_up_date = CURDATE()');
//     res.json(results);
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ error: 'Database error' });
//   }
// };
