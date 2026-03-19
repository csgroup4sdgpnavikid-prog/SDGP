// routes/tripRoutes.js
const express = require('express');
const router = express.Router();
const { handleStartTrip, handleEndTrip, handleUpdateStop } = require('../controllers/tripController');
const { verifyToken } = require('../middleware/authMiddleware');
const { locationLimiter } = require('../middleware/rateLimitMiddleware');

// All trip routes require a valid Firebase ID token + per-IP rate limiting
router.post('/start',       verifyToken, locationLimiter, handleStartTrip);
router.post('/end',         verifyToken, locationLimiter, handleEndTrip);
router.post('/update-stop', verifyToken, locationLimiter, handleUpdateStop);

module.exports = router;
