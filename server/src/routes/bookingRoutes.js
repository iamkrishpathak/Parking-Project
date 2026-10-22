const express = require('express');
const { createBooking, getHostBookings, getDriverBookings, deleteBooking, getHostSummary } = require('../controllers/bookingController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimit');
const requireVerifiedEmail = require('../middleware/requireVerifiedEmail');

const router = express.Router();

router.post('/create', authMiddleware(['driver']), rateLimit({ windowMs: 60 * 1000, max: 5 }), requireVerifiedEmail, createBooking);
router.get('/host', authMiddleware(['host', 'admin']), getHostBookings);
router.get('/host/summary', authMiddleware(['host', 'admin']), getHostSummary);
router.delete('/:id', authMiddleware(['driver', 'host', 'admin']), rateLimit({ windowMs: 60 * 1000, max: 10 }), deleteBooking);
router.get('/driver', authMiddleware(['driver']), getDriverBookings);

module.exports = router;

