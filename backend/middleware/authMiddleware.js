// middleware/authMiddleware.js - Authentication middleware
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Verify user token (placeholder - implement with Firebase Auth in production)
 * For now, this just checks if userId exists in the request
 */
const verifyToken = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    const role = req.headers['x-user-role'] || req.body.role || req.query.role;

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing user ID' });
    }

    try {
        // In production, verify Firebase ID token here
        // const decodedToken = await admin.auth().verifyIdToken(idToken);

        // For now, just attach userId to request
        req.userId = userId;
        req.userRole = role;

        next();
    } catch (error) {
        console.error('Auth error:', error);
        res.status(401).json({ error: 'Unauthorized', details: error.message });
    }
};

/**
 * Optional authentication - doesn't fail if no auth provided
 */
const optionalAuth = async (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.body.userId || req.query.userId;
    const role = req.headers['x-user-role'] || req.body.role || req.query.role;

    if (userId) {
        req.userId = userId;
        req.userRole = role;
    }

    next();
};

module.exports = {
    verifyToken,
    optionalAuth,
};
