const express = require('express');
const {
  createSpace,
  updateSpace,
  uploadSpaceFiles,
  submitSpaceForReview,
  searchSpaces,
  getHostedSpaces,
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

const router = express.Router();

router.get('/public/:id/photos/:fileId', streamPublicSpacePhoto);
router.get('/verification-requirements', getVerificationRequirements);
router.post('/create', authMiddleware(['host', 'admin']), rateLimit({ max: 10 }), createSpace);
router.get('/mine', authMiddleware(['host', 'admin']), getHostedSpaces);
router.get('/search', searchSpaces);
router.put('/:id', authMiddleware(['host', 'admin']), rateLimit({ max: 20 }), updateSpace);
router.post(
  '/:id/files',
  authMiddleware(['host', 'admin']),
  rateLimit({ max: 10 }),
  upload.fields([
    { name: 'photos', maxCount: 5 },
    { name: 'authorizationDocuments', maxCount: 3 },
  ]),
  uploadSpaceFiles
);
router.post('/:id/submit', authMiddleware(['host', 'admin']), rateLimit({ max: 10 }), submitSpaceForReview);
router.get('/:id/files', authMiddleware(['host', 'admin']), getSpaceEvidence);
router.delete('/:id/files/:fileId', authMiddleware(['host', 'admin']), rateLimit({ max: 20 }), deleteSpaceEvidence);
router.get('/:id/files/:fileId', authMiddleware(['host', 'admin']), streamSpaceEvidence);
router.put('/:id/price', authMiddleware(['host', 'admin']), updatePrice);

module.exports = router;

