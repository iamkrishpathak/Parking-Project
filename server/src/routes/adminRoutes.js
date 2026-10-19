const express = require('express');
const { 
  getPendingVerifications, 
  verifyUserKYC, 
  getPendingParkingSpaces, 
  reviewParkingSpace,
  getAllUsers,
  getAllParkingSpaces,
  getParkingSpaceDetails,
  streamParkingSpaceFile,
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const rateLimit = require('../middleware/rateLimit');

const router = express.Router();

// Apply admin middleware to all routes
router.use(authMiddleware(['admin']));

// User Management
router.get('/users', getAllUsers);
router.get('/verifications/pending', getPendingVerifications);
router.put('/verifications/user/:userId', verifyUserKYC);

// Parking Space Management
router.get('/parking-spaces', getAllParkingSpaces);
router.get('/parking-spaces/pending', getPendingParkingSpaces);
router.get('/parking-spaces/:spaceId/files/:fileId', streamParkingSpaceFile);
router.get('/parking-spaces/:spaceId', getParkingSpaceDetails);
router.put('/parking-spaces/:spaceId/review', rateLimit({ max: 30 }), reviewParkingSpace);

module.exports = router;
