// routes/index.js - Central route aggregator
const express = require('express');
const router = express.Router();

const sosRoutes     = require('./sosRoutes');      // POST /api/sos/trigger
const tripRoutes    = require('./tripRoutes');     // POST /api/trips/start|end|update-stop
const absenceRoutes = require('./absenceRoutes'); // POST /api/absence/mark|confirm
const healthRoutes  = require('./healthRoutes');   // GET  /api/health

router.use('/sos',      sosRoutes);
router.use('/trips',    tripRoutes);
router.use('/absence',  absenceRoutes);
router.use('/health',   healthRoutes);

module.exports = router;
