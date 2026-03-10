// routes/locationRoutes.js - GPS and location tracking routes
const express = require('express');
const router = express.Router();
const {
    handleLocationUpdate,
    getLocation,
    getVanLocationForParent
} = require('../controllers/locationController');

// POST /api/location/update - Update driver location
router.post('/update', handleLocationUpdate);

// GET /api/location/:driverId - Get driver's current location
router.get('/:driverId', getLocation);

// GET /api/location/van/:childId - Get van location for parent (via child)
router.get('/van/:childId', getVanLocationForParent);

module.exports = router;
