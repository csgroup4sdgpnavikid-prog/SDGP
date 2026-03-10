// services/tripService.js - Trip management utilities
const { db, admin } = require('../config/firebase');
const { COLLECTIONS, TRIP_STATUS } = require('../utils/constants');

/**
 * Create a new trip
 * @param {string} driverId - Driver ID
 * @param {string} vanId - Van ID
 * @param {Array} stops - Array of stop objects
 * @param {string} tripType - 'morning' or 'evening'
 * @returns {Object} - Created trip data
 */
const createTrip = async (driverId, vanId, stops, tripType = 'morning') => {
    const tripRef = db.collection(COLLECTIONS.TRIPS).doc();

    const tripData = {
        tripId: tripRef.id,
        driverId,
        vanId,
        tripType,
        status: TRIP_STATUS.NOT_STARTED,
        stops: stops.map((stop, index) => ({
            ...stop,
            order: index,
            status: 'pending', // pending, picked, dropped, skipped
        })),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        startedAt: null,
        endedAt: null,
        lastLocation: null,
    };

    await tripRef.set(tripData);

    return { ...tripData, tripId: tripRef.id };
};

/**
 * Start a trip
 * @param {string} tripId - Trip ID
 * @param {Object} startLocation - Starting location
 * @returns {Object} - Updated trip data
 */
const startTrip = async (tripId, startLocation = null) => {
    const tripRef = db.collection(COLLECTIONS.TRIPS).doc(tripId);

    const updateData = {
        status: TRIP_STATUS.IN_PROGRESS,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (startLocation) {
        updateData.lastLocation = {
            ...startLocation,
            updatedAt: new Date().toISOString(),
        };
    }

    await tripRef.update(updateData);

    const updatedTrip = await tripRef.get();
    return updatedTrip.data();
};

/**
 * End a trip
 * @param {string} tripId - Trip ID
 * @returns {Object} - Updated trip data
 */
const endTrip = async (tripId) => {
    const tripRef = db.collection(COLLECTIONS.TRIPS).doc(tripId);

    await tripRef.update({
        status: TRIP_STATUS.COMPLETED,
        endedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clear active trip from driver
    const tripDoc = await tripRef.get();
    const tripData = tripDoc.data();

    await db.collection(COLLECTIONS.DRIVERS).doc(tripData.driverId).update({
        activeTripId: null,
    });

    return tripData;
};

/**
 * Update stop status (picked up, dropped off, skipped)
 * @param {string} tripId - Trip ID
 * @param {number} stopIndex - Index of the stop
 * @param {string} status - New status
 */
const updateStopStatus = async (tripId, stopIndex, status) => {
    const tripRef = db.collection(COLLECTIONS.TRIPS).doc(tripId);
    const tripDoc = await tripRef.get();

    if (!tripDoc.exists) {
        throw new Error('Trip not found');
    }

    const tripData = tripDoc.data();
    const stops = tripData.stops;

    if (stopIndex < 0 || stopIndex >= stops.length) {
        throw new Error('Invalid stop index');
    }

    stops[stopIndex].status = status;
    stops[stopIndex].updatedAt = new Date().toISOString();

    await tripRef.update({ stops });

    return stops[stopIndex];
};

/**
 * Get active trip for a driver
 * @param {string} driverId - Driver ID
 * @returns {Object|null} - Active trip or null
 */
const getActiveTrip = async (driverId) => {
    const tripsSnapshot = await db.collection(COLLECTIONS.TRIPS)
        .where('driverId', '==', driverId)
        .where('status', '==', TRIP_STATUS.IN_PROGRESS)
        .limit(1)
        .get();

    if (tripsSnapshot.empty) {
        return null;
    }

    return tripsSnapshot.docs[0].data();
};

/**
 * Get trip by ID
 * @param {string} tripId - Trip ID
 * @returns {Object|null} - Trip data or null
 */
const getTripById = async (tripId) => {
    const tripDoc = await db.collection(COLLECTIONS.TRIPS).doc(tripId).get();

    if (!tripDoc.exists) {
        return null;
    }

    return tripDoc.data();
};

module.exports = {
    createTrip,
    startTrip,
    endTrip,
    updateStopStatus,
    getActiveTrip,
    getTripById,
};
