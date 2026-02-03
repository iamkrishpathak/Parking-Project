const express = require('express');
const { 
  getPendingVerifications, 
  verifyUserKYC, 
  getPendingParkingSpaces, 
  reviewParkingSpace,
  getAllUsers,
  getAllParkingSpaces
} = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');

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
router.put('/parking-spaces/:spaceId/review', reviewParkingSpace);

module.exports = router;
