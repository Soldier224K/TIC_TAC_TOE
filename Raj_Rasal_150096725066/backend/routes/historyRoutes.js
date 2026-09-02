// =============================================================================
// Game & History API Router
// =============================================================================

const express = require('express');
const router = express.Router();
const {
  getGameHistory,
  getServerStatus,
} = require('../controllers/historyController');

// Routes
router.get('/history', getGameHistory);
router.get('/status', getServerStatus);

module.exports = router;
