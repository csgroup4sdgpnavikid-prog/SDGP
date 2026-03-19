// middleware/rateLimitMiddleware.js - Rate limiting per route category
const rateLimit = require('express-rate-limit');

/**
 * General API rate limit — 100 req / 15 min per IP
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});

/**
 * Auth endpoints — 10 req / 15 min per IP (prevent brute-force)
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later.' },
});

/**
 * SOS alerts — 5 req / 5 min per IP (prevent spam)
 */
const sosLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many SOS requests, please wait before sending another alert.' },
});

/**
 * Location updates — 120 req / min per IP (high-frequency GPS updates)
 */
const locationLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Location update rate limit exceeded.' },
});

module.exports = { generalLimiter, authLimiter, sosLimiter, locationLimiter };
