require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { db } = require('./config/firebase');
const routes = require('./routes/index');
const { generalLimiter } = require('./middleware/rateLimitMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Core middleware ───────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',').map(o => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // No origin = mobile app or server-to-server (always allow)
        if (!origin) return callback(null, true);
        // If no whitelist configured, block all browser origins in production
        if (allowedOrigins.length === 0) {
            if (process.env.NODE_ENV === 'production') {
                return callback(new Error('CORS: no origins configured'));
            }
            // Dev: allow localhost origins only
            if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
                return callback(null, true);
            }
            return callback(new Error('CORS: origin not allowed'));
        }
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));

// ── Security headers ─────────────────────────────────────────────────────────
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (process.env.NODE_ENV === 'production') {
        res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
});

app.use(express.json({ limit: '50kb' })); // prevent oversized request bodies
app.use(generalLimiter); // Apply general rate limit to all routes

// ── Routes ───────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'NaviKid API is running.' }));
app.use('/api', routes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found.` });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
        console.error('[server] Unhandled error:', err.message, err.code || '');
    } else {
        console.error('[server] Unhandled error:', err.message, err.stack);
    }
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error.' : err.message,
    });
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`NaviKid API running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
    });
}

module.exports = app;
