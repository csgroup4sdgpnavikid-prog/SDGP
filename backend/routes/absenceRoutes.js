// routes/absenceRoutes.js
const express = require('express');
const router = express.Router();
const { markAbsence, confirmAbsence } = require('../controllers/absenceController');
const { verifyToken } = require('../middleware/authMiddleware');

// All absence routes require a valid Firebase ID token
router.post('/mark',    verifyToken, markAbsence);
router.post('/confirm', verifyToken, confirmAbsence);

module.exports = router;
