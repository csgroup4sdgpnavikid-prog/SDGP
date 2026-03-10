// routes/sosRoutes.js - Emergency alert routes
const express = require('express');
const router = express.Router();
const { triggerSOS, getAlertHistory } = require('../controllers/sosController');

// POST /api/sos/trigger - Trigger SOS emergency alert
router.post('/trigger', triggerSOS);

// GET /api/sos/history/:driverId - Get emergency alert history
router.get('/history/:driverId', getAlertHistory);

module.exports = router;
