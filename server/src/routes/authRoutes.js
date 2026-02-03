const express = require('express');
const { register, login, updateProfile, uploadKYC, uploadKycFiles, getPendingKYC, updateKYCStatus } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authMiddleware(['driver', 'host', 'admin']), updateProfile);
router.post('/kyc-upload', authMiddleware(['host']), uploadKycFiles, uploadKYC);

// Admin KYC management routes
router.get('/admin/pending-kyc', authMiddleware(['admin']), getPendingKYC);
router.put('/admin/kyc/:kycId/status', authMiddleware(['admin']), updateKYCStatus);

module.exports = router;

