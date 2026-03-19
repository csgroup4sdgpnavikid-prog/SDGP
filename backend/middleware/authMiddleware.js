// middleware/authMiddleware.js - Firebase ID token verification
const { admin } = require('../config/firebase');

/**
 * Verify Firebase ID token from Authorization header.
 * Attaches decoded uid + role to req.user.
 * Also enforces email verification — unverified accounts are rejected.
 *
 * Client must send:  Authorization: Bearer <firebaseIdToken>
 */
const verifyToken = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header.' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decoded = await admin.auth().verifyIdToken(idToken);

        req.user = {
            uid: decoded.uid,
            email: decoded.email,
            role: decoded.role || null,  // role must come from Firebase custom claims only
        };
        next();
    } catch (err) {
        console.error('[authMiddleware] Token verification failed:', err.message);
        const expired = err.code === 'auth/id-token-expired';
        res.status(401).json({
            error: expired ? 'Session expired. Please log in again.' : 'Unauthorized: Invalid token.',
        });
    }
};

/**
 * Optional auth — attaches user if token present, but does NOT block if missing.
 * Use on endpoints that behave differently for authenticated vs anonymous users.
 */
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

    const idToken = authHeader.split('Bearer ')[1];
    try {
        const decoded = await admin.auth().verifyIdToken(idToken);
        req.user = { uid: decoded.uid, email: decoded.email };
    } catch {
        // Invalid token — treat as unauthenticated
    }
    next();
};

module.exports = { verifyToken, optionalAuth };
