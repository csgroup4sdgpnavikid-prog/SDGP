// controllers/tripController.js - Driver journey control logic
const { db } = require('../config/firebase');
const { COLLECTIONS, TRIP_STATUS } = require('../utils/constants');
const {
    createTrip,
    startTrip,
    endTrip,
    getActiveTrip,
    getTripById,
    updateStopStatus
} = require('../services/tripService');
const { generateOptimizedRoute } = require('../services/routeOptimizer');
const { sendTripStatusNotification, sendChildStatusNotification, sendProximityNotification } = require('../services/notificationService');
const { Expo } = require('../config/expo');

/**
 * Start a new trip
 * POST /api/trips/start
 */


/**
 * End a trip
 * POST /api/trips/end
 * driverId is optional — always uses token uid for ownership verification.
 */
const handleEndTrip = async (req, res) => {
    const { tripId } = req.body;
    const driverId = req.user.uid; // Always derive from token, never trust body

    try {
        let activeTrip;

        if (tripId) {
            activeTrip = await getTripById(tripId);
        } else {
            activeTrip = await getActiveTrip(driverId);
        }

        if (!activeTrip) {
            return res.status(404).json({ error: 'No active trip found' });
        }

        // Verify the authenticated driver owns this trip
        if (activeTrip.driverId !== driverId) {
            return res.status(403).json({ error: 'Forbidden: this trip belongs to a different driver.' });
        }

        // End the trip
        const endedTrip = await endTrip(activeTrip.tripId);

        // Notify parents that trip has ended
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(activeTrip.driverId).get();
        if (driverDoc.exists) {
            const driverData = driverDoc.data();
            const parentIds = driverData.associatedParentIds || [];

            if (parentIds.length > 0) {
                const parentDocs = await Promise.all(
                    parentIds.map(id => db.collection(COLLECTIONS.PARENTS).doc(id).get())
                );
                const parentTokens = parentDocs
                    .filter(doc => doc.exists)
                    .map(doc => doc.data().expoPushToken)
                    .filter(token => token && Expo.isExpoPushToken(token));

                if (parentTokens.length > 0) {
                    await sendTripStatusNotification(parentTokens, 'ended', driverData.name || 'Driver');
                }
            }
        }

        console.log(`Trip ended: ${activeTrip.tripId}`);

        res.status(200).json({
            success: true,
            message: 'Trip ended successfully',
            tripId: activeTrip.tripId,
        });

    } catch (error) {
        console.error('Error ending trip:', error);
        res.status(500).json({ error: 'Failed to end trip' });
    }
};

/**
 * Update child pickup/dropoff status
 * POST /api/trips/update-stop
 */
const handleUpdateStop = async (req, res) => {
    const { tripId, stopIndex, status, childId } = req.body;

    if (!tripId || stopIndex === undefined || !status) {
        return res.status(400).json({ error: 'Missing required fields: tripId, stopIndex, status' });
    }

    const ALLOWED_STATUSES = ['pending', 'picked', 'dropped', 'skipped', 'approaching'];
    if (!ALLOWED_STATUSES.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    try {
        // Ownership check — verify the caller is the driver of this trip
        const tripDoc = await db.collection(COLLECTIONS.TRIPS).doc(tripId).get();
        if (!tripDoc.exists) {
            return res.status(404).json({ error: 'Trip not found' });
        }
        if (tripDoc.data().driverId !== req.user.uid) {
            return res.status(403).json({ error: 'Forbidden: you are not the driver of this trip.' });
        }

        // If childId provided, find the actual stop index by childId (more reliable than frontend index)
        let stopIdx = stopIndex;
        if (childId) {
            const tripData = tripDoc.data();
            const foundIdx = (tripData.stops || []).findIndex(s => s.childId === childId);
            if (foundIdx >= 0) stopIdx = foundIdx;
        }

        const updatedStop = await updateStopStatus(tripId, stopIdx, status);

        // Notify parent on 'picked', 'dropped', or 'approaching'
        if (childId && (status === 'picked' || status === 'dropped' || status === 'approaching')) {
            const tripDoc2 = await db.collection(COLLECTIONS.TRIPS).doc(tripId).get();
            const stop = tripDoc2.exists ? (tripDoc2.data().stops || [])[stopIdx] : null;
            const parentId = stop?.parentId;

            if (parentId) {
                // Children live at parents/{parentId}/children/{childId} — subcollection
                const childDoc = await db.collection(COLLECTIONS.PARENTS).doc(parentId)
                    .collection('children').doc(childId).get();

                if (childDoc.exists) {
                    const childData = childDoc.data();
                    const parentDoc = await db.collection(COLLECTIONS.PARENTS).doc(parentId).get();

                    if (parentDoc.exists) {
                        const parentData = parentDoc.data();
                        const token = parentData.expoPushToken;

                        if (token && Expo.isExpoPushToken(token)) {
                            if (status === 'approaching') {
                                await sendProximityNotification(
                                    token,
                                    childData.name || 'Your child',
                                    'home',
                                    2  // estimated ~2 minutes when within 500m
                                );
                            } else {
                                await sendChildStatusNotification(
                                    token,
                                    childData.name || 'Your child',
                                    status === 'picked' ? 'picked' : 'dropped'
                                );
                            }
                        }
                    }
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Stop status updated to: ${status}`,
            stop: updatedStop,
        });

    } catch (error) {
        console.error('Error updating stop:', error);
        res.status(500).json({ error: 'Failed to update stop' });
    }
};

module.exports = { handleStartTrip, handleEndTrip, handleUpdateStop };
