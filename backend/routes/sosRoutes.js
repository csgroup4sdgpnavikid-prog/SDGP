// routes/sosRoutes.js
const express = require('express');
const router = express.Router();
const { triggerSOS } = require('../controllers/sosController');
const { verifyToken } = require('../middleware/authMiddleware');
const { sosLimiter } = require('../middleware/rateLimitMiddleware');

// POST /api/sos/trigger  — driver only, uid must match body.driverId (5 req/5min)
router.post('/trigger', sosLimiter, verifyToken, triggerSOS);

module.exports = router;
