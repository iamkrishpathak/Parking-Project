const express = require('express');
const { createBooking, getHostBookings, getDriverBookings, deleteBooking, getHostSummary } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware(['driver']), createBooking);
router.get('/host', authMiddleware(['host', 'admin']), getHostBookings);
router.get('/host/summary', authMiddleware(['host', 'admin']), getHostSummary);
router.delete('/:id', authMiddleware(['host', 'admin']), deleteBooking);
router.get('/driver', authMiddleware(['driver']), getDriverBookings);

module.exports = router;

