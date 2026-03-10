// services/locationService.js - GPS tracking and geofencing service
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');
const { calculateDistance, isWithinRadius } = require('../utils/helpers');

// Default proximity radius in kilometers
const DEFAULT_PROXIMITY_RADIUS_KM = 0.5; // 500 meters

/**
 * Update driver/van location in Firestore
 * @param {string} driverId - Driver ID
 * @param {Object} location - { latitude, longitude }
 * @param {string} tripId - Active trip ID (optional)
 */
const updateDriverLocation = async (driverId, location, tripId = null) => {
    const updateData = {
        currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude,
            updatedAt: new Date().toISOString(),
        },
    };

    if (tripId) {
        updateData.activeTripId = tripId;
    }

    await db.collection(COLLECTIONS.DRIVERS).doc(driverId).update(updateData);

    // Also update trip location history if trip is active
    if (tripId) {
        await db.collection(COLLECTIONS.TRIPS).doc(tripId).update({
            lastLocation: updateData.currentLocation,
            // Optionally append to location history (for route tracking)
            // locationHistory: admin.firestore.FieldValue.arrayUnion(updateData.currentLocation),
        });
    }

    return updateData.currentLocation;
};

/**
 * Get driver's current location
 * @param {string} driverId - Driver ID
 * @returns {Object|null} - Location object or null
 */
const getDriverLocation = async (driverId) => {
    const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();

    if (!driverDoc.exists) {
        return null;
    }

    return driverDoc.data().currentLocation || null;
};

/**
 * Check proximity of driver to a specific location
 * @param {Object} driverLocation - { latitude, longitude }
 * @param {Object} targetLocation - { latitude, longitude }
 * @param {number} radiusKm - Proximity radius in kilometers
 * @returns {Object} - { isNear: boolean, distanceKm: number }
 */
const checkProximity = (driverLocation, targetLocation, radiusKm = DEFAULT_PROXIMITY_RADIUS_KM) => {
    const distanceKm = calculateDistance(
        driverLocation.latitude,
        driverLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
    );

    return {
        isNear: distanceKm <= radiusKm,
        distanceKm: Math.round(distanceKm * 100) / 100, // Round to 2 decimal places
    };
};

/**
 * Get all children stops for a trip and check proximity to each
 * @param {string} tripId - Trip ID
 * @param {Object} driverLocation - Current driver location
 * @returns {Array} - Array of stops with proximity info
 */
const checkStopsProximity = async (tripId, driverLocation) => {
    const tripDoc = await db.collection(COLLECTIONS.TRIPS).doc(tripId).get();

    if (!tripDoc.exists) {
        return [];
    }

    const tripData = tripDoc.data();
    const stops = tripData.stops || [];

    return stops.map(stop => ({
        ...stop,
        proximity: checkProximity(driverLocation, stop.location),
    }));
};

/**
 * Estimate arrival time based on distance and average speed
 * @param {number} distanceKm - Distance in kilometers
 * @param {number} avgSpeedKmh - Average speed in km/h (default 30 for urban)
 * @returns {number} - Estimated time in minutes
 */
const estimateArrivalTime = (distanceKm, avgSpeedKmh = 30) => {
    return Math.ceil((distanceKm / avgSpeedKmh) * 60);
};

module.exports = {
    updateDriverLocation,
    getDriverLocation,
    checkProximity,
    checkStopsProximity,
    estimateArrivalTime,
    DEFAULT_PROXIMITY_RADIUS_KM,
};
