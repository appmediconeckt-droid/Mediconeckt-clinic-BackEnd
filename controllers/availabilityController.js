// controllers/availabilityController.js
import db from '../config/db.js';

class AvailabilityController {
    // Get all existing ranges
    async getAllRanges(req, res) {
        try {
            const [ranges] = await db.query(
                'SELECT * FROM date_ranges ORDER BY start_date DESC'
            );
            const [unavailableDates] = await db.query(
                'SELECT unavailable_date FROM unavailable_dates ORDER BY unavailable_date'
            );
            
            res.json({
                success: true,
                existingRanges: ranges,
                unavailableDates: unavailableDates.map(d => d.unavailable_date)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Add new date range
    async addDateRange(req, res) {
        const { start_date, end_date, slot_duration, is_unavailable } = req.body;
        
        // Validation
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Start date and end date are required' 
            });
        }

        // Validate date range
        if (new Date(start_date) > new Date(end_date)) {
            return res.status(400).json({ 
                success: false, 
                error: 'Start date must be before or equal to end date' 
            });
        }

        // Check if trying to add past dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(start_date) < today) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot add past time slots' 
            });
        }

        try {
            const [result] = await db.query(
                `INSERT INTO date_ranges (start_date, end_date, slot_duration, is_unavailable) 
                 VALUES (?, ?, ?, ?)`,
                [start_date, end_date, slot_duration || 15, is_unavailable || false]
            );
            
            res.json({
                success: true,
                message: 'Date range added successfully',
                rangeId: result.insertId
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Mark specific date as unavailable
    async markDateUnavailable(req, res) {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Date is required' 
            });
        }

        // Check if it's a past date
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(date) < today) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot mark past dates as unavailable' 
            });
        }

        try {
            await db.query(
                'INSERT INTO unavailable_dates (unavailable_date) VALUES (?) ON DUPLICATE KEY UPDATE unavailable_date = unavailable_date',
                [date]
            );
            
            res.json({
                success: true,
                message: 'Date marked as unavailable successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Clear specific date from unavailable list
    async clearDateRange(req, res) {
        const { date } = req.body;
        
        if (!date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Date is required' 
            });
        }

        try {
            await db.query(
                'DELETE FROM unavailable_dates WHERE unavailable_date = ?',
                [date]
            );
            
            // Also remove from date_ranges if it's a specific range
            await db.query(
                'DELETE FROM date_ranges WHERE start_date = ? AND end_date = ?',
                [date, date]
            );
            
            res.json({
                success: true,
                message: 'Date range cleared successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Clear all unavailable dates
    async clearAllUnavailableDates(req, res) {
        try {
            await db.query('DELETE FROM unavailable_dates');
            await db.query('DELETE FROM date_ranges WHERE is_unavailable = true');
            
            res.json({
                success: true,
                message: 'All unavailable dates cleared successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Delete a specific date range
    async deleteDateRange(req, res) {
        const { id } = req.params;
        
        try {
            const [result] = await db.query('DELETE FROM date_ranges WHERE id = ?', [id]);
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Date range not found' 
                });
            }
            
            res.json({
                success: true,
                message: 'Date range deleted successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Update date range
    async updateDateRange(req, res) {
        const { id } = req.params;
        const { start_date, end_date, slot_duration, is_unavailable } = req.body;
        
        if (!start_date || !end_date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Start date and end date are required' 
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (new Date(start_date) < today) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot update past time slots' 
            });
        }

        try {
            const [result] = await db.query(
                `UPDATE date_ranges 
                 SET start_date = ?, end_date = ?, slot_duration = ?, is_unavailable = ? 
                 WHERE id = ?`,
                [start_date, end_date, slot_duration, is_unavailable, id]
            );
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Date range not found' 
                });
            }
            
            res.json({
                success: true,
                message: 'Date range updated successfully'
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }

    // Get available dates (excluding unavailable dates)
    async getAvailableDates(req, res) {
        try {
            const [unavailableDates] = await db.query(
                'SELECT unavailable_date FROM unavailable_dates'
            );
            
            const [ranges] = await db.query(
                'SELECT * FROM date_ranges WHERE is_unavailable = false'
            );
            
            const unavailableSet = new Set(unavailableDates.map(d => d.unavailable_date));
            
            res.json({
                success: true,
                unavailableDates: Array.from(unavailableSet),
                availableRanges: ranges
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
}

export default new AvailabilityController();
