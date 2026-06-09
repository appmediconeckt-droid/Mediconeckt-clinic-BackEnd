// routes/availabilityRoutes.js
import express from 'express';
import availabilityController from '../controllers/availabilityController.js';


const router = express.Router();
// GET all ranges and unavailable dates
router.get('/ranges', availabilityController.getAllRanges.bind(availabilityController));

// POST add new date range
router.post('/ranges', availabilityController.addDateRange.bind(availabilityController));

// PUT update date range
router.put('/ranges/:id', availabilityController.updateDateRange.bind(availabilityController));

// DELETE date range
router.delete('/ranges/:id', availabilityController.deleteDateRange.bind(availabilityController));

// POST mark specific date as unavailable
router.post('/unavailable', availabilityController.markDateUnavailable.bind(availabilityController));

// DELETE clear specific date range
router.delete('/clear-date', availabilityController.clearDateRange.bind(availabilityController));

// DELETE clear all unavailable dates
router.delete('/clear-all', availabilityController.clearAllUnavailableDates.bind(availabilityController));

// GET available dates
router.get('/available', availabilityController.getAvailableDates.bind(availabilityController));

export default router;
