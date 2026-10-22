const express = require('express');
const { register, login, googleLogin, requestPasswordReset, resetPassword, updateProfile, uploadKYC, getPendingKYC, updateKYCStatus, requestKycDocuments, getKycStatus, streamKycDocument, verifyEmail, resendEmailVerification } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', rateLimit({ windowMs: 60 * 60 * 1000, max: 8 }), register);
router.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), login);
router.post('/google', rateLimit({ windowMs: 15 * 60 * 1000, max: 15 }), googleLogin);
router.post('/verify-email', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), verifyEmail);
router.post('/resend-verification', authMiddleware(['driver', 'host']), rateLimit({ windowMs: 60 * 60 * 1000, max: 4 }), resendEmailVerification);
router.post('/forgot-password', rateLimit({ windowMs: 60 * 60 * 1000, max: 3 }), requestPasswordReset);
router.post('/reset-password', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), resetPassword);
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


