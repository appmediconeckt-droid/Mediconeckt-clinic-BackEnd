import db from '../config/db.js ';

// ========== USER APIS ==========

// Apply for leave
export const applyLeave = async (req, res) => {
    try {
        const { leave_type, start_date, end_date, reason } = req.body;
        const user_id = req.user.id;

        if (!leave_type || !start_date || !end_date || !reason) {
            return res.status(400).json({ 
                success: false, 
                error: "All fields are required" 
            });
        }

        const query = `
            INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason, status)
            VALUES (?, ?, ?, ?, ?, 'pending')
        `;

        const [result] = await db.execute(query, [
            user_id, 
            leave_type, 
            start_date, 
            end_date, 
            reason
        ]);

        res.status(201).json({
            success: true,
            message: "Leave applied successfully",
            data: {
                leave_id: result.insertId,
                user_id: user_id,
                leave_type: leave_type,
                start_date: start_date,
                end_date: end_date,
                reason: reason,
                status: 'pending'
            }
        });

    } catch (error) {
        console.error('Error applying leave:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get all leaves of logged-in user
export const getUserLeaves = async (req, res) => {
    try {
        const user_id = req.user.id;

        const query = `
            SELECT id, leave_type, start_date, end_date, reason, status, created_at
            FROM leaves 
            WHERE user_id = ? 
            ORDER BY created_at DESC
        `;

        const [leaves] = await db.execute(query, [user_id]);

        res.status(200).json({
            success: true,
            data: leaves
        });

    } catch (error) {
        console.error('Error fetching leaves:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Cancel a pending leave
export const cancelLeave = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        const query = `
            UPDATE leaves 
            SET status = 'cancelled' 
            WHERE id = ? AND user_id = ? AND status = 'pending'
        `;

        const [result] = await db.execute(query, [id, user_id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Leave not found or cannot be cancelled"
            });
        }

        res.status(200).json({
            success: true,
            message: "Leave cancelled successfully"
        });

    } catch (error) {
        console.error('Error cancelling leave:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// ========== ADMIN APIS ==========

// Get user by ID (admin only)
export const getUserById = async (req, res) => {
    try {
        const { user_id } = req.params;

        // Check if admin (you can add role check middleware)
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Access denied. Admin only."
            });
        }

        const query = `
            SELECT id, name, email, role, created_at 
            FROM users 
            WHERE id = ?
        `;

        const [users] = await db.execute(query, [user_id]);

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                error: "User not found"
            });
        }

        res.status(200).json({
            success: true,
            data: users[0]
        });

    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get all leaves with user details (admin)
export const getAllLeaves = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Access denied. Admin only."
            });
        }

        const query = `
            SELECT 
                l.id,
                l.user_id,
                u.name as user_name,
                u.email as user_email,
                l.leave_type,
                l.start_date,
                l.end_date,
                l.reason,
                l.status,
                l.created_at
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            ORDER BY l.created_at DESC
        `;

        const [leaves] = await db.execute(query);

        res.status(200).json({
            success: true,
            data: leaves
        });

    } catch (error) {
        console.error('Error fetching all leaves:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Approve or Reject leave (admin)
export const updateLeaveStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'approved' or 'rejected'

        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Access denied. Admin only."
            });
        }

        if (!status || (status !== 'approved' && status !== 'rejected')) {
            return res.status(400).json({
                success: false,
                error: "Status must be 'approved' or 'rejected'"
            });
        }

        // Check if leave exists and is pending
        const checkQuery = `SELECT * FROM leaves WHERE id = ? AND status = 'pending'`;
        const [leaves] = await db.execute(checkQuery, [id]);

        if (leaves.length === 0) {
            return res.status(404).json({
                success: false,
                error: "Leave not found or already processed"
            });
        }

        // Update status
        const updateQuery = `
            UPDATE leaves 
            SET status = ? 
            WHERE id = ?
        `;
        
        const [result] = await db.execute(updateQuery, [status, id]);

        res.status(200).json({
            success: true,
            message: `Leave ${status} successfully`,
            data: {
                leave_id: id,
                status: status,
                user_id: leaves[0].user_id
            }
        });

    } catch (error) {
        console.error('Error updating leave status:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};

// Get pending leaves (admin)
export const getPendingLeaves = async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: "Access denied. Admin only."
            });
        }

        const query = `
            SELECT 
                l.id,
                l.user_id,
                u.name as user_name,
                u.email as user_email,
                l.leave_type,
                l.start_date,
                l.end_date,
                l.reason,
                l.created_at
            FROM leaves l
            JOIN users u ON l.user_id = u.id
            WHERE l.status = 'pending'
            ORDER BY l.created_at ASC
        `;

        const [leaves] = await db.execute(query);

        res.status(200).json({
            success: true,
            data: leaves
        });

    } catch (error) {
        console.error('Error fetching pending leaves:', error);
        res.status(500).json({ 
            success: false, 
            error: "Internal server error" 
        });
    }
};