const express = require('express');
const {
  createSpace,
  updateSpace,
  uploadSpaceFiles,
  uploadListingPhotos,
  submitSpaceForReview,
  searchSpaces,
  getHostedSpaces,
  archiveSpace,
  getSpaceEvidence,
  streamSpaceEvidence,
  deleteSpaceEvidence,
  streamPublicSpacePhoto,
  getVerificationRequirements,
  updatePrice,
} = require('../controllers/spaceController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/verificationUploadMiddleware');
const rateLimit = require('../middleware/rateLimit');
const requireVerifiedEmail = require('../middleware/requireVerifiedEmail');

const router = express.Router();

router.get('/public/:id/photos/:fileId', streamPublicSpacePhoto);
router.get('/verification-requirements', getVerificationRequirements);
router.post('/create', authMiddleware(['host', 'admin']), rateLimit({ max: 10 }), requireVerifiedEmail, createSpace);
router.get('/mine', authMiddleware(['host', 'admin']), getHostedSpaces);
router.delete('/:id', authMiddleware(['host']), rateLimit({ max: 10 }), requireVerifiedEmail, archiveSpace);
router.get('/search', rateLimit({ windowMs: 60 * 1000, max: 60 }), searchSpaces);
router.put('/:id', authMiddleware(['host', 'admin']), rateLimit({ max: 20 }), requireVerifiedEmail, updateSpace);
router.post(
  '/:id/files',
  authMiddleware(['host', 'admin']),
  rateLimit({ max: 10 }),
  requireVerifiedEmail,
  upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'authorizationDocuments', maxCount: 3 },
  ]),
  uploadSpaceFiles
);
router.post(
  '/:id/listing-photos',
  authMiddleware(['host']),
  rateLimit({ max: 10 }),
  requireVerifiedEmail,
  upload.array('photos', 5),
  uploadListingPhotos
);
router.post('/:id/submit', authMiddleware(['host', 'admin']), rateLimit({ max: 10 }), requireVerifiedEmail, submitSpaceForReview);
router.get('/:id/files', authMiddleware(['host', 'admin']), getSpaceEvidence);
router.delete('/:id/files/:fileId', authMiddleware(['host', 'admin']), rateLimit({ max: 20 }), requireVerifiedEmail, deleteSpaceEvidence);
router.get('/:id/files/:fileId', authMiddleware(['host', 'admin']), streamSpaceEvidence);
router.put('/:id/price', authMiddleware(['host', 'admin']), rateLimit({ max: 20 }), requireVerifiedEmail, updatePrice);

module.exports = router;

