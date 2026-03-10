// controllers/locationController.js - GPS and proximity tracking logic
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');
const {
    updateDriverLocation,
    getDriverLocation,
    checkProximity,
    checkStopsProximity,
    estimateArrivalTime
} = require('../services/locationService');
const { getActiveTrip } = require('../services/tripService');
const { sendProximityNotification } = require('../services/notificationService');
const { isValidLocation } = require('../utils/validators');
const { Expo } = require('../config/expo');

// Track notified stops to avoid duplicate notifications (in-memory, would use Redis in production)
const notifiedStops = new Map();

/**
 * Update driver location
 * POST /api/location/update
 */
const handleLocationUpdate = async (req, res) => {
    const { driverId, latitude, longitude } = req.body;

    if (!driverId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({ error: 'Missing required fields: driverId, latitude, longitude' });
    }

    if (!isValidLocation({ latitude, longitude })) {
        return res.status(400).json({ error: 'Invalid coordinates' });
    }

    try {
        // Get active trip for this driver
        const activeTrip = await getActiveTrip(driverId);

        // Update location in Firestore
        const location = await updateDriverLocation(
            driverId,
            { latitude, longitude },
            activeTrip?.tripId || null
        );

        // If there's an active trip, check proximity to stops
        let proximityAlerts = [];
        if (activeTrip) {
            proximityAlerts = await checkAndNotifyProximity(
                driverId,
                activeTrip,
                { latitude, longitude }
            );
        }

        res.status(200).json({
            success: true,
            location,
            activeTripId: activeTrip?.tripId || null,
            proximityAlerts,
        });

    } catch (error) {
        console.error('Error updating location:', error);
        res.status(500).json({ error: 'Failed to update location', details: error.message });
    }
};

/**
 * Check proximity and send notifications to parents
 */
const checkAndNotifyProximity = async (driverId, trip, driverLocation) => {
    const alerts = [];
    const tripKey = `${trip.tripId}`;

    // Get stops with proximity info
    const stopsWithProximity = await checkStopsProximity(trip.tripId, driverLocation);

    for (const stop of stopsWithProximity) {
        const stopKey = `${tripKey}-${stop.childId}`;

        // Skip if already notified or not within proximity
        if (notifiedStops.has(stopKey) || !stop.proximity.isNear) {
            continue;
        }

        // Skip if stop already completed
        if (stop.status === 'picked' || stop.status === 'dropped' || stop.status === 'skipped') {
            continue;
        }

        try {
            // Get child's parent
            const childDoc = await db.collection(COLLECTIONS.CHILDREN).doc(stop.childId).get();
            if (!childDoc.exists) continue;

            const childData = childDoc.data();
            const parentDoc = await db.collection(COLLECTIONS.PARENTS).doc(childData.parentId).get();
            if (!parentDoc.exists) continue;

            const parentData = parentDoc.data();
            if (!parentData.expoPushToken || !Expo.isExpoPushToken(parentData.expoPushToken)) continue;

            // Estimate arrival time
            const estimatedMinutes = estimateArrivalTime(stop.proximity.distanceKm);

            // Send proximity notification
            await sendProximityNotification(
                parentData.expoPushToken,
                childData.name || 'Your child',
                stop.locationType || 'home',
                estimatedMinutes
            );

            // Mark as notified
            notifiedStops.set(stopKey, Date.now());

            alerts.push({
                childId: stop.childId,
                childName: childData.name,
                distanceKm: stop.proximity.distanceKm,
                estimatedMinutes,
            });

            console.log(`Proximity alert sent for child: ${stop.childId}`);
        } catch (error) {
            console.error(`Error sending proximity notification for stop:`, error);
        }
    }

    // Cleanup old notifications (older than 1 hour)
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    for (const [key, timestamp] of notifiedStops.entries()) {
        if (timestamp < oneHourAgo) {
            notifiedStops.delete(key);
        }
    }

    return alerts;
};

/**
 * Get driver's current location
 * GET /api/location/:driverId
 */
const getLocation = async (req, res) => {
    const { driverId } = req.params;

    if (!driverId) {
        return res.status(400).json({ error: 'Missing driverId' });
    }

    try {
        const location = await getDriverLocation(driverId);

        if (!location) {
            return res.status(404).json({ error: 'Location not found for this driver' });
        }

        res.status(200).json({ success: true, location });

    } catch (error) {
        console.error('Error fetching location:', error);
        res.status(500).json({ error: 'Failed to fetch location', details: error.message });
    }
};

/**
 * Get van location for a parent (via their child)
 * GET /api/location/van/:childId
 */
const getVanLocationForParent = async (req, res) => {
    const { childId } = req.params;
    const { parentId } = req.query;

    if (!childId) {
        return res.status(400).json({ error: 'Missing childId' });
    }

    try {
        // Get child document
        const childDoc = await db.collection(COLLECTIONS.CHILDREN).doc(childId).get();
        if (!childDoc.exists) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const childData = childDoc.data();

        // Verify parent access (controlled parental access)
        if (parentId && childData.parentId !== parentId) {
            return res.status(403).json({ error: 'Access denied. You can only view your own child\'s van location.' });
        }

        // Get driver's location
        const driverId = childData.driverId;
        if (!driverId) {
            return res.status(404).json({ error: 'No driver assigned to this child' });
        }

        // Check if driver has an active trip
        const activeTrip = await getActiveTrip(driverId);
        if (!activeTrip) {
            return res.status(200).json({
                success: true,
                tripActive: false,
                message: 'No active trip. Van location is only available during trips.'
            });
        }

        const location = await getDriverLocation(driverId);

        res.status(200).json({
            success: true,
            tripActive: true,
            tripId: activeTrip.tripId,
            location,
            lastUpdated: location?.updatedAt || null,
        });

    } catch (error) {
        console.error('Error fetching van location for parent:', error);
        res.status(500).json({ error: 'Failed to fetch van location', details: error.message });
    }
};

module.exports = {
    handleLocationUpdate,
    getLocation,
    getVanLocationForParent,
};
