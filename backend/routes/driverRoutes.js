// routes/driverRoutes.js - Driver listing routes used by the rating screen
const express = require('express');
const router = express.Router();
const { getAllDrivers, getDriverById } = require('../controllers/driverController');

// GET /api/drivers - list all drivers
router.get('/', getAllDrivers);

// GET /api/drivers/:id - fetch a single driver
router.get('/:id', getDriverById);

module.exports = router;
