const express = require('express');
const { register, login, updateProfile, uploadKYC, getPendingKYC, updateKYCStatus } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authMiddleware(['driver', 'host', 'admin']), updateProfile);
router.post('/kyc-upload', authMiddleware(['host']), upload.fields([
  { name: 'identityProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 }
]), uploadKYC);

// Admin-only KYC management routes (with enhanced security)
router.get('/admin/pending-kyc', adminMiddleware, getPendingKYC);
router.put('/admin/kyc/:kycId/status', adminMiddleware, updateKYCStatus);

module.exports = router;


