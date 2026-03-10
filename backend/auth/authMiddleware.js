// auth/authMiddleware.js - JWT Verification Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-this';

/**
 * Middleware to protect routes using JWT
 */
const protect = (req, res, next) => {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, JWT_SECRET);

            // Add user info to request object
            req.user = decoded; // { userId, role, email, iat, exp }
            req.userId = decoded.userId;
            req.userRole = decoded.role;

            next();
        } catch (error) {
            console.error('Token verification failed:', error.message);
            return res.status(401).json({ error: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        return res.status(401).json({ error: 'Not authorized, no token' });
    }
};

module.exports = { protect };
