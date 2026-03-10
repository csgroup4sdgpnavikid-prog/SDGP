// routes/index.js - Route aggregator
const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./authRoutes');
const sosRoutes = require('./sosRoutes');
const tripRoutes = require('./tripRoutes');
const locationRoutes = require('./locationRoutes');
const absenceRoutes = require('./absenceRoutes');
const ratingRoutes = require('./ratingRoutes');
const driverRoutes = require('./driverRoutes');
const healthRoutes = require('./healthRoutes');
const passwordResetRoutes = require('./passwordResetRoutes');

// Mount routes
router.use('/auth', authRoutes);           // /api/auth/*
router.use('/sos', sosRoutes);             // /api/sos/*
router.use('/trips', tripRoutes);          // /api/trips/*
router.use('/location', locationRoutes);   // /api/location/*
router.use('/absence', absenceRoutes);     // /api/absence/*
router.use('/ratings', ratingRoutes);      // /api/ratings/*
router.use('/drivers', driverRoutes);      // /api/drivers/*
router.use('/health', healthRoutes);       // /api/health
router.use('/auth', passwordResetRoutes);

module.exports = router;
