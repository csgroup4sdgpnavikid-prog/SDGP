// auth/authRoutes.js - Add to existing auth routes
const express = require('express');
const router = express.Router();
const { register, login } = require('./authController');
const passwordResetRoutes = require('../routes/passwordResetRoutes');

// Existing routes
router.post('/register', register);
router.post('/login', login);

// Password reset routes
router.use('/', passwordResetRoutes);

module.exports = router;