const express = require('express');
const {
  createSpace,
  searchSpaces,
  getHostedSpaces,
  updatePrice,
} = require('../controllers/spaceController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware(['host', 'admin']), createSpace);
router.get('/mine', authMiddleware(['host', 'admin']), getHostedSpaces);
router.put('/:id/price', authMiddleware(['host', 'admin']), updatePrice);
router.get('/search', searchSpaces);

module.exports = router;

