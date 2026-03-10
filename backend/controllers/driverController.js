// controllers/driverController.js - Driver listing for rating screen
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');

/**
 * Normalize a raw Firestore driver doc into the shape the frontend expects.
 * Handles both the main-backend registration schema and the backend_1 seed schema.
 */
const normalizeDriver = (id, data) => ({
    id,
    name: data.name || data.driverName || 'Unknown',
    vanNumber: data.vanNumber || data.vanId || data.vehicleNumber || '',
    route: data.route || data.serviceArea || data.routeName || '',
});

/**
 * GET /api/drivers
 * Returns all driver documents sorted by name.
 */
const getAllDrivers = async (req, res) => {
    try {
        const snapshot = await db.collection(COLLECTIONS.DRIVERS).get();
        const drivers = [];
        snapshot.forEach((doc) => {
            drivers.push(normalizeDriver(doc.id, doc.data()));
        });

        // Sort by name client-side to avoid requiring a Firestore index
        drivers.sort((a, b) => a.name.localeCompare(b.name));

        res.status(200).json({ success: true, drivers });
    } catch (error) {
        console.error('GET /api/drivers error:', error);
        res.status(500).json({ success: false, message: 'Error fetching drivers', details: error.message });
    }
};

/**
 * GET /api/drivers/:id
 * Returns a single driver by document ID.
 */
const getDriverById = async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await db.collection(COLLECTIONS.DRIVERS).doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        res.status(200).json({ success: true, driver: normalizeDriver(doc.id, doc.data()) });
    } catch (error) {
        console.error('GET /api/drivers/:id error:', error);
        res.status(500).json({ success: false, message: 'Error fetching driver', details: error.message });
    }
};

module.exports = { getAllDrivers, getDriverById };
