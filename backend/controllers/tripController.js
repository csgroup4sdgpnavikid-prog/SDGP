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
const handleStartTrip = async (req, res) => {
    const { driverId, vanId, tripType, startLocation, selectedChildIds } = req.body;

    if (!driverId) {
        return res.status(400).json({ error: 'Missing required field: driverId' });
    }
    if (req.user.uid !== driverId) {
        return res.status(403).json({ error: 'Forbidden: token uid does not match driverId.' });
    }

    try {
        // Atomically check activeTripId to prevent race condition where two concurrent
        // requests both pass the "no active trip" check and create duplicate trips.
        const driverRef = db.collection(COLLECTIONS.DRIVERS).doc(driverId);
        let existingTripId = null;
        await db.runTransaction(async (transaction) => {
            const driverSnap = await transaction.get(driverRef);
            if (!driverSnap.exists) throw Object.assign(new Error('Driver not found'), { status: 404 });
            existingTripId = driverSnap.data().activeTripId || null;
        });
        if (existingTripId) {
            return res.status(400).json({
                error: 'Driver already has an active trip',
                tripId: existingTripId,
            });
        }

        // Get driver data to find associated children/stops
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();
        if (!driverDoc.exists) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const driverData = driverDoc.data();

        // Build stops from parents/{parentId}/children subcollections (new schema)
        const parentIds = driverData.associatedParentIds || [];
        const allStops = [];
        for (const parentId of parentIds) {
            const childrenSnap = await db
                .collection(COLLECTIONS.PARENTS)
                .doc(parentId)
                .collection('children')
                .get();
            childrenSnap.forEach(childDoc => {
                const c = childDoc.data();
                if (c.isAbsent) return;
                if (!c.homeAddress?.lat || !c.homeAddress?.lng) return;
                allStops.push({
                    childId:     childDoc.id,
                    parentId,
                    childName:   c.name    || 'Student',
                    school:      c.school  || '',
                    stopType:    'pickup',
                    location: {
                        latitude:  c.homeAddress.lat,
                        longitude: c.homeAddress.lng,
                        address:   c.homeAddress.address || '',
                    },
                    parentPhone: c.parentPhone || '',
                });
            });
        }

        // Generate optimized route considering today's absences
        const driverLocation = startLocation || driverData.homeLocation || { latitude: 0, longitude: 0 };
        let optimizedResult;
        try {
            optimizedResult = await generateOptimizedRoute(
                driverId,
                allStops,
                driverLocation,
                tripType || 'morning'
            );
        } catch (routeErr) {
            console.error('Route optimization failed (using unoptimized stops):', routeErr.message);
            optimizedResult = {
                optimizedStops: allStops,
                removedStops: [],
                absentChildIds: [],
                totalDistanceKm: 0,
            };
        }

        // Filter stops to only selected children (if driver provided a selection)
        const finalStops = Array.isArray(selectedChildIds) && selectedChildIds.length > 0
            ? optimizedResult.optimizedStops.filter(s =>
                selectedChildIds.includes(s.childId || s.id)
              )
            : optimizedResult.optimizedStops;

        // Create the trip with optimized + filtered stops
        const trip = await createTrip(
            driverId,
            vanId ?? driverData.vanId ?? null,
            finalStops,
            tripType || 'morning'
        );

        // Start the trip
        const startedTrip = await startTrip(trip.tripId, startLocation);

        // Update driver's active trip
        await db.collection(COLLECTIONS.DRIVERS).doc(driverId).update({
            activeTripId: trip.tripId,
        });

        // Notify only the parents of selected children (not all associated parents)
        const notifyParentIds = finalStops.length > 0
            ? [...new Set(finalStops.map(s => s.parentId).filter(Boolean))]
            : (driverData.associatedParentIds || []);

        if (notifyParentIds.length > 0) {
            const parentDocs = await Promise.all(
                notifyParentIds.map(id => db.collection(COLLECTIONS.PARENTS).doc(id).get())
            );
            const parentTokens = parentDocs
                .filter(doc => doc.exists)
                .map(doc => doc.data().expoPushToken)
                .filter(token => token && Expo.isExpoPushToken(token));

            if (parentTokens.length > 0) {
                await sendTripStatusNotification(parentTokens, 'started', driverData.name || 'Driver');
            }
        }

        console.log(`Trip started: ${trip.tripId} for driver: ${driverId}`);

        res.status(200).json({
            success: true,
            message: 'Trip started successfully',
            trip: startedTrip,
            optimizationInfo: {
                totalStops: finalStops.length,
                removedAbsentStops: optimizedResult.removedStops.length,
                removedByDriverSelection: optimizedResult.optimizedStops.length - finalStops.length,
                estimatedDistance: optimizedResult.totalDistanceKm,
            },
        });

    } catch (error) {
        console.error('Error starting trip:', error);
        res.status(error.status || 500).json({ error: error.message || 'Failed to start trip' });
    }
};

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
