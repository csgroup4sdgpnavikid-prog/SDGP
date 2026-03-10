// controllers/ratingController.js - Driver rating and van selection logic
const { db, admin } = require('../config/firebase');
const { COLLECTIONS } = require('../utils/constants');
const { validateRequiredFields } = require('../utils/validators');

// Rating can only be submitted every 3 months (in milliseconds)
const RATING_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Submit driver rating
 * POST /api/ratings/submit
 */
const submitRating = async (req, res) => {
    const { parentId, driverId, safety, punctuality, service, comment } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['parentId', 'driverId', 'safety', 'punctuality', 'service']);
    if (!validation.isValid) {
        return res.status(400).json({
            error: `Missing required fields: ${validation.missingFields.join(', ')}`
        });
    }

    // Validate rating values (1-5)
    const ratings = { safety, punctuality, service };
    for (const [key, value] of Object.entries(ratings)) {
        if (typeof value !== 'number' || value < 1 || value > 5) {
            return res.status(400).json({ error: `Invalid ${key} rating. Must be between 1 and 5.` });
        }
    }

    try {
        // Check if parent has already rated this driver within cooldown period
        const recentRatings = await db.collection(COLLECTIONS.RATINGS)
            .where('parentId', '==', parentId)
            .where('driverId', '==', driverId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (!recentRatings.empty) {
            const lastRating = recentRatings.docs[0].data();
            const lastRatingTime = lastRating.createdAt?.toDate() || new Date(0);
            const timeSinceLastRating = Date.now() - lastRatingTime.getTime();

            if (timeSinceLastRating < RATING_COOLDOWN_MS) {
                const daysRemaining = Math.ceil((RATING_COOLDOWN_MS - timeSinceLastRating) / (24 * 60 * 60 * 1000));
                return res.status(400).json({
                    error: `You can only rate a driver every 3 months. Please wait ${daysRemaining} more days.`
                });
            }
        }

        // Verify driver exists
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();
        if (!driverDoc.exists) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        // Calculate overall rating
        const overall = (safety + punctuality + service) / 3;

        // Create rating record
        const ratingRef = db.collection(COLLECTIONS.RATINGS).doc();
        const ratingData = {
            ratingId: ratingRef.id,
            parentId,
            driverId,
            safety,
            punctuality,
            service,
            overall: Math.round(overall * 10) / 10, // Round to 1 decimal
            comment: comment || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await ratingRef.set(ratingData);

        // Update driver's average rating
        await updateDriverAverageRating(driverId);

        console.log(`Rating submitted for driver ${driverId} by parent ${parentId}`);

        res.status(200).json({
            success: true,
            message: 'Rating submitted successfully',
            rating: ratingData,
        });

    } catch (error) {
        console.error('Error submitting rating:', error);
        res.status(500).json({ error: 'Failed to submit rating', details: error.message });
    }
};

/**
 * Update driver's average rating
 */
const updateDriverAverageRating = async (driverId) => {
    const ratingsSnapshot = await db.collection(COLLECTIONS.RATINGS)
        .where('driverId', '==', driverId)
        .get();

    if (ratingsSnapshot.empty) return;

    let totalSafety = 0;
    let totalPunctuality = 0;
    let totalService = 0;
    let totalOverall = 0;
    let count = ratingsSnapshot.size;

    ratingsSnapshot.forEach(doc => {
        const rating = doc.data();
        totalSafety += rating.safety || 0;
        totalPunctuality += rating.punctuality || 0;
        totalService += rating.service || 0;
        totalOverall += rating.overall || 0;
    });

    const averageRating = {
        safety: Math.round((totalSafety / count) * 10) / 10,
        punctuality: Math.round((totalPunctuality / count) * 10) / 10,
        service: Math.round((totalService / count) * 10) / 10,
        overall: Math.round((totalOverall / count) * 10) / 10,
        totalRatings: count,
        lastUpdated: new Date().toISOString(),
    };

    await db.collection(COLLECTIONS.DRIVERS).doc(driverId).update({
        averageRating,
    });
};

/**
 * Get driver's ratings
 * GET /api/ratings/driver/:driverId
 */
const getDriverRatings = async (req, res) => {
    const { driverId } = req.params;
    const { limit = 10 } = req.query;

    if (!driverId) {
        return res.status(400).json({ error: 'Missing driverId' });
    }

    try {
        // Get driver info with average rating
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();
        if (!driverDoc.exists) {
            return res.status(404).json({ error: 'Driver not found' });
        }

        const driverData = driverDoc.data();
        const averageRating = driverData.averageRating || null;

        // Get recent ratings
        const ratingsSnapshot = await db.collection(COLLECTIONS.RATINGS)
            .where('driverId', '==', driverId)
            .orderBy('createdAt', 'desc')
            .limit(parseInt(limit))
            .get();

        const ratings = ratingsSnapshot.docs.map(doc => {
            const data = doc.data();
            // Don't expose parentId in public ratings
            delete data.parentId;
            return data;
        });

        res.status(200).json({
            success: true,
            driverId,
            driverName: driverData.name || null,
            averageRating,
            recentRatings: ratings,
        });

    } catch (error) {
        console.error('Error fetching driver ratings:', error);
        res.status(500).json({ error: 'Failed to fetch ratings', details: error.message });
    }
};

/**
 * Get available vans on a route with ratings
 * GET /api/ratings/vans
 */
const getVansOnRoute = async (req, res) => {
    const { pickupLat, pickupLng, dropoffLat, dropoffLng, radiusKm = 5 } = req.query;

    if (!pickupLat || !pickupLng) {
        return res.status(400).json({ error: 'Missing pickup coordinates' });
    }

    try {
        // Get all drivers/vans
        // Note: For production, use geohashing or a geospatial database for efficient queries
        const driversSnapshot = await db.collection(COLLECTIONS.DRIVERS).get();

        const vans = [];

        driversSnapshot.forEach(doc => {
            const driver = doc.data();

            // Skip drivers without route information
            if (!driver.serviceArea) return;

            // Check if driver services this area (simplified check)
            // In production, implement proper geospatial queries
            const isInServiceArea = true; // Placeholder - implement actual logic

            if (isInServiceArea) {
                vans.push({
                    driverId: doc.id,
                    driverName: driver.name || 'Unknown',
                    vanId: driver.vanId || null,
                    vanInfo: driver.vanInfo || null,
                    averageRating: driver.averageRating || null,
                    serviceArea: driver.serviceArea,
                    availableSeats: driver.availableSeats || 0,
                    pricePerMonth: driver.pricePerMonth || null,
                });
            }
        });

        // Sort by overall rating (highest first)
        vans.sort((a, b) => {
            const ratingA = a.averageRating?.overall || 0;
            const ratingB = b.averageRating?.overall || 0;
            return ratingB - ratingA;
        });

        res.status(200).json({
            success: true,
            vans,
            count: vans.length,
        });

    } catch (error) {
        console.error('Error fetching vans on route:', error);
        res.status(500).json({ error: 'Failed to fetch vans', details: error.message });
    }
};

/**
 * Check if parent can rate a driver
 * GET /api/ratings/can-rate
 */
const canRateDriver = async (req, res) => {
    const { parentId, driverId } = req.query;

    if (!parentId || !driverId) {
        return res.status(400).json({ error: 'Missing parentId or driverId' });
    }

    try {
        const recentRatings = await db.collection(COLLECTIONS.RATINGS)
            .where('parentId', '==', parentId)
            .where('driverId', '==', driverId)
            .orderBy('createdAt', 'desc')
            .limit(1)
            .get();

        if (recentRatings.empty) {
            return res.status(200).json({ canRate: true, message: 'You can rate this driver.' });
        }

        const lastRating = recentRatings.docs[0].data();
        const lastRatingTime = lastRating.createdAt?.toDate() || new Date(0);
        const timeSinceLastRating = Date.now() - lastRatingTime.getTime();

        if (timeSinceLastRating >= RATING_COOLDOWN_MS) {
            return res.status(200).json({ canRate: true, message: 'You can rate this driver.' });
        }

        const daysRemaining = Math.ceil((RATING_COOLDOWN_MS - timeSinceLastRating) / (24 * 60 * 60 * 1000));

        res.status(200).json({
            canRate: false,
            message: `You can rate again in ${daysRemaining} days.`,
            daysRemaining,
        });

    } catch (error) {
        console.error('Error checking rate eligibility:', error);
        res.status(500).json({ error: 'Failed to check', details: error.message });
    }
};

/**
 * GET /api/ratings
 * Returns all ratings with optional filters: ?stars=4 and/or ?driverId=abc
 * Used by the Parent "Rate Driver" screen to display rating history.
 */
const getAllRatings = async (req, res) => {
    const { stars, driverId } = req.query;

    try {
        let query = db.collection(COLLECTIONS.RATINGS);

        if (driverId) {
            query = query.where('driverId', '==', driverId);
        }

        const snapshot = await query.get();
        let ratings = [];
        snapshot.forEach((doc) => ratings.push({ id: doc.id, ...doc.data() }));

        // Filter by overall star rating client-side to avoid composite index requirement
        if (stars) {
            const starsNum = Number(stars);
            ratings = ratings.filter((r) => Math.round(r.overall) === starsNum);
        }

        // Sort newest first — handles both Firestore Timestamp and ISO string
        ratings.sort((a, b) => {
            const toMs = (v) => {
                if (!v) return 0;
                if (typeof v.toDate === 'function') return v.toDate().getTime();
                return new Date(v).getTime();
            };
            return toMs(b.createdAt) - toMs(a.createdAt);
        });

        res.status(200).json({ success: true, ratings });
    } catch (error) {
        console.error('GET /api/ratings error:', error);
        res.status(500).json({ success: false, message: 'Error fetching ratings', details: error.message });
    }
};

module.exports = {
    submitRating,
    getDriverRatings,
    getVansOnRoute,
    canRateDriver,
    getAllRatings,
};
