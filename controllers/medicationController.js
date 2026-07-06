import db from '../config/db.js ';

// Add new medication
export const addMedication = async (req, res) => {
    try {
        const { 
            medication_name, 
            dose, 
            timing, 
            route, 
            patient_name, 
            room_number, 
            remarks 
        } = req.body;

        // Validation
        if (!medication_name || !dose || !timing || !route || !patient_name || !room_number) {
            return res.status(400).json({ 
                success: false, 
                error: "All required fields: medication_name, dose, timing, route, patient_name, room_number" 
            });
        }

        const query = `
            INSERT INTO medications (medication_name, dose, timing, route, patient_name, room_number, remarks, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
        `;

        const [result] = await db.execute(query, [
            medication_name, 
            dose, 
            timing, 
            route, 
            patient_name, 
            room_number, 
            remarks || null
        ]);

        res.status(201).json({
            success: true,
            message: "Medication added successfully",
            data: {
                id: result.insertId,
                medication_name,
                dose,
                timing,
                route,
                patient_name,
                room_number,
                remarks: remarks || null,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error adding medication:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get all medications
export const getAllMedications = async (req, res) => {
    try {
        const { search } = req.query; // search by medication name or patient name
        
        let query = `
            SELECT id, medication_name, dose, timing, route, patient_name, room_number, status, remarks, created_at
            FROM medications
        `;
        
        let params = [];
        
        if (search) {
            query += ` WHERE medication_name LIKE ? OR patient_name LIKE ?`;
            params = [`%${search}%`, `%${search}%`];
        }
        
        query += ` ORDER BY created_at DESC`;
        
        const [medications] = await db.execute(query, params);
        
        // Add counts for dashboard
        const total = medications.length;
        const given = medications.filter(m => m.status === 'given').length;
        const pending = medications.filter(m => m.status === 'pending').length;
        const missed = medications.filter(m => m.status === 'missed').length;
        
        res.status(200).json({
            success: true,
            counts: {
                total,
                given,
                pending,
                missed
            },
            data: medications
        });

    } catch (error) {
        console.error('Error fetching medications:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get medication by ID
export const getMedicationById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `
            SELECT id, medication_name, dose, timing, route, patient_name, room_number, status, remarks, created_at, updated_at
            FROM medications 
            WHERE id = ?
        `;
        
        const [medications] = await db.execute(query, [id]);
        
        if (medications.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Medication not found"
            });
        }
        
        res.status(200).json({
            success: true,
            data: medications[0]
        });

    } catch (error) {
        console.error('Error fetching medication:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Update medication status (given/pending/missed)
export const updateMedicationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'given', 'pending', or 'missed'
        
        if (!status || !['given', 'pending', 'missed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be 'given', 'pending', or 'missed'"
            });
        }
        
        const query = `
            UPDATE medications 
            SET status = ? 
            WHERE id = ?
        `;
        
        const [result] = await db.execute(query, [status, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Medication not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: `Medication status updated to ${status}`,
            data: {
                id: parseInt(id),
                status: status
            }
        });

    } catch (error) {
        console.error('Error updating medication status:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Update complete medication details
export const updateMedication = async (req, res) => {
    try {
        const { id } = req.params;
        const { 
            medication_name, 
            dose, 
            timing, 
            route, 
            patient_name, 
            room_number, 
            remarks 
        } = req.body;
        
        const query = `
            UPDATE medications 
            SET medication_name = ?, dose = ?, timing = ?, route = ?, 
                patient_name = ?, room_number = ?, remarks = ?
            WHERE id = ?
        `;
        
        const [result] = await db.execute(query, [
            medication_name, 
            dose, 
            timing, 
            route, 
            patient_name, 
            room_number, 
            remarks || null,
            id
        ]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Medication not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Medication updated successfully",
            data: {
                id: parseInt(id),
                medication_name,
                dose,
                timing,
                route,
                patient_name,
                room_number,
                remarks: remarks || null
            }
        });

    } catch (error) {
        console.error('Error updating medication:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Delete medication
export const deleteMedication = async (req, res) => {
    try {
        const { id } = req.params;
        
        const query = `DELETE FROM medications WHERE id = ?`;
        
        const [result] = await db.execute(query, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Medication not found"
            });
        }
        
        res.status(200).json({
            success: true,
            message: "Medication deleted successfully"
        });

    } catch (error) {
        console.error('Error deleting medication:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get medications by status
export const getMedicationsByStatus = async (req, res) => {
    try {
        const { status } = req.params; // given, pending, missed
        
        if (!['given', 'pending', 'missed'].includes(status)) {
            return res.status(400).json({
                success: false,
                error: "Status must be 'given', 'pending', or 'missed'"
            });
        }
        
        const query = `
            SELECT id, medication_name, dose, timing, route, patient_name, room_number, status, remarks, created_at
            FROM medications 
            WHERE status = ?
            ORDER BY created_at DESC
        `;
        
        const [medications] = await db.execute(query, [status]);
        
        res.status(200).json({
            success: true,
            count: medications.length,
            data: medications
        });

    } catch (error) {
        console.error('Error fetching medications by status:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};