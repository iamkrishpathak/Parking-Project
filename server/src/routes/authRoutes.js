const express = require('express');
const { register, login, googleLogin, requestPasswordReset, resetPassword, updateProfile, uploadKYC, getPendingKYC, updateKYCStatus, requestKycDocuments, getKycStatus, streamKycDocument } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.post('/forgot-password', requestPasswordReset);
router.post('/reset-password', resetPassword);
router.put('/profile', authMiddleware(['driver', 'host', 'admin']), updateProfile);
router.get('/kyc-status', authMiddleware(['host']), getKycStatus);
router.get('/kyc/:userId/documents/:filename', authMiddleware(['driver', 'host', 'admin']), streamKycDocument);
router.post('/kyc-upload', authMiddleware(['host']), upload.fields([
  { name: 'identityProof', maxCount: 1 },
  { name: 'addressProof', maxCount: 1 }
]), uploadKYC);

// Admin-only KYC management routes (with enhanced security)
router.get('/admin/pending-kyc', adminMiddleware, getPendingKYC);
router.put('/admin/kyc/:kycId/status', adminMiddleware, updateKYCStatus);
router.put('/admin/kyc/:kycId/request-docs', adminMiddleware, requestKycDocuments);

module.exports = router;


