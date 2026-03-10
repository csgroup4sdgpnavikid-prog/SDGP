// services/routeOptimizer.js - Route optimization for absence handling
const { db } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');
const { calculateDistance } = require('../utils/helpers');

/**
 * Optimize route by removing absent children's stops
 * @param {Array} stops - Original array of stops
 * @param {Array} absentChildIds - Array of child IDs who are absent
 * @returns {Array} - Optimized array of stops
 */
const removeAbsentStops = (stops, absentChildIds) => {
    return stops.filter(stop => !absentChildIds.includes(stop.childId));
};

/**
 * Reorder stops to minimize total distance (simple nearest neighbor algorithm)
 * @param {Array} stops - Array of stop objects with location
 * @param {Object} startLocation - Starting location { latitude, longitude }
 * @returns {Array} - Reordered stops
 */
const optimizeStopOrder = (stops, startLocation) => {
    if (stops.length <= 1) return stops;

    const optimized = [];
    const remaining = [...stops];
    let currentLocation = startLocation;

    while (remaining.length > 0) {
        // Find nearest stop
        let nearestIndex = 0;
        let nearestDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
            const distance = calculateDistance(
                currentLocation.latitude,
                currentLocation.longitude,
                remaining[i].location.latitude,
                remaining[i].location.longitude
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = i;
            }
        }

        // Add nearest to optimized route
        const nearest = remaining.splice(nearestIndex, 1)[0];
        optimized.push(nearest);
        currentLocation = nearest.location;
    }

    // Update order property
    return optimized.map((stop, index) => ({
        ...stop,
        order: index,
    }));
};

/**
 * Get today's absences for a driver's route
 * @param {string} driverId - Driver ID
 * @param {string} tripType - 'morning' or 'evening'
 * @returns {Array} - Array of absent child IDs
 */
const getTodaysAbsences = async (driverId, tripType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const absencesSnapshot = await db.collection(COLLECTIONS.ABSENCES)
        .where('driverId', '==', driverId)
        .where('date', '>=', today)
        .where('date', '<', tomorrow)
        .get();

    const absentChildIds = [];

    absencesSnapshot.forEach(doc => {
        const absence = doc.data();

        // Check if absence applies to this trip type
        if (absence.absenceType === 'full_day') {
            absentChildIds.push(absence.childId);
        } else if (absence.absenceType === 'morning_only' && tripType === 'morning') {
            absentChildIds.push(absence.childId);
        } else if (absence.absenceType === 'evening_only' && tripType === 'evening') {
            absentChildIds.push(absence.childId);
        }
    });

    return absentChildIds;
};

/**
 * Generate optimized route for today considering absences
 * @param {string} driverId - Driver ID
 * @param {Array} allStops - All possible stops
 * @param {Object} startLocation - Starting location
 * @param {string} tripType - 'morning' or 'evening'
 * @returns {Object} - { optimizedStops, removedStops, totalDistance }
 */
const generateOptimizedRoute = async (driverId, allStops, startLocation, tripType) => {
    // Get today's absences
    const absentChildIds = await getTodaysAbsences(driverId, tripType);

    // Separate absent and present stops
    const removedStops = allStops.filter(stop => absentChildIds.includes(stop.childId));
    const activeStops = removeAbsentStops(allStops, absentChildIds);

    // Optimize the order of active stops
    const optimizedStops = optimizeStopOrder(activeStops, startLocation);

    // Calculate total distance
    let totalDistance = 0;
    let prevLocation = startLocation;

    for (const stop of optimizedStops) {
        totalDistance += calculateDistance(
            prevLocation.latitude,
            prevLocation.longitude,
            stop.location.latitude,
            stop.location.longitude
        );
        prevLocation = stop.location;
    }

    return {
        optimizedStops,
        removedStops,
        absentChildIds,
        totalDistanceKm: Math.round(totalDistance * 100) / 100,
    };
};

module.exports = {
    removeAbsentStops,
    optimizeStopOrder,
    getTodaysAbsences,
    generateOptimizedRoute,
};
