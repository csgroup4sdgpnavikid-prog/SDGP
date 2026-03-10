// routes/authRoutes.js - Authentication and token registration routes
const express = require('express');
const router = express.Router();
const { registerToken, getUserInfo } = require('../controllers/authController');

// POST /api/auth/register-token - Register Expo Push Token
router.post('/register-token', registerToken);

// GET /api/auth/user/:userId - Get user info
router.get('/user/:userId', getUserInfo);

module.exports = router;
