// controllers/sosController.js - Emergency alert logic
const { db, admin } = require('../config/firebase');
const { Expo } = require('../config/expo');
const { sendPushNotifications } = require('../services/notificationService');
const { COLLECTIONS, ALERT_STATUS } = require('../utils/constants');
const { validateRequiredFields, isValidLocation } = require('../utils/validators');

/**
 * Trigger SOS Emergency Alert
 * POST /api/sos/trigger
 */
const triggerSOS = async (req, res) => {
    const { driverId, message, location } = req.body;

    console.log('Received SOS request:', { driverId, message });

    // Validate required fields
    if (!driverId) {
        return res.status(400).json({ error: 'Missing required field: driverId' });
    }

    try {
        // Fetch driver document from Firestore
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();

        if (!driverDoc.exists) {
            console.error(`Driver document not found for ID: ${driverId}`);
            return res.status(404).json({ error: 'Driver not found' });
        }

        const driverData = driverDoc.data();
        console.log('Driver data found:', driverData);

        // Get the list of parent IDs associated with this driver
        const associatedParentIds = driverData.associatedParentIds || [];

        if (associatedParentIds.length === 0) {
            console.warn(`No parents associated with driver ID: ${driverId}`);
            return res.status(404).json({ error: 'No parents associated with this driver' });
        }

        console.log(`Found ${associatedParentIds.length} associated parents for driver ${driverId}`);

        // Fetch Expo tokens for associated parents
        const parentDocs = await Promise.all(
            associatedParentIds.map(parentId =>
                db.collection(COLLECTIONS.PARENTS).doc(parentId).get()
            )
        );

        // Extract valid Expo tokens
        const parentExpoTokens = parentDocs
            .filter(doc => doc.exists)
            .map(doc => doc.data().expoPushToken)
            .filter(token => token && Expo.isExpoPushToken(token));

        console.log(`Found ${parentExpoTokens.length} valid Expo tokens for parents`);

        if (parentExpoTokens.length === 0) {
            console.warn(`No valid Expo tokens found for parents of driver: ${driverId}`);
            return res.status(404).json({ error: 'No valid parent Expo push tokens found' });
        }

        // Prepare notification data
        const notificationData = {
            type: 'EMERGENCY',
            driverId: driverId,
            driverName: driverData.name || 'Driver',
            timestamp: new Date().toISOString(),
            location: location ? JSON.stringify(location) : null,
        };

        // Send notifications using notification service
        const result = await sendPushNotifications(
            parentExpoTokens,
            '🚨 EMERGENCY ALERT!',
            message || 'Driver has triggered an emergency alert.',
            notificationData
        );

        // Determine alert status
        let alertStatus;
        if (result.errors === 0) {
            alertStatus = ALERT_STATUS.SENT;
        } else if (result.success > 0) {
            alertStatus = ALERT_STATUS.PARTIALLY_SENT;
        } else {
            alertStatus = ALERT_STATUS.FAILED;
        }

        // Log the emergency alert to Firestore
        const alertRef = db.collection(COLLECTIONS.EMERGENCY_ALERTS).doc();
        await alertRef.set({
            alertId: alertRef.id,
            driverId: driverId,
            driverName: driverData.name || null,
            parentIds: associatedParentIds,
            message: message || 'Emergency triggered by driver.',
            location: location || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: alertStatus,
            notificationsSent: result.success,
            notificationsFailed: result.errors,
        });

        console.log(`Emergency alert logged in Firestore with ID: ${alertRef.id}`);

        res.status(200).json({
            success: true,
            message: 'SOS alert sent',
            sentToCount: result.success,
            failedCount: result.errors,
            loggedAlertId: alertRef.id,
        });

    } catch (error) {
        console.error('Error processing SOS request:', error);
        res.status(500).json({
            error: 'Internal server error while processing SOS',
            details: error.message
        });
    }
};

/**
 * Get emergency alerts history for a driver
 * GET /api/sos/history/:driverId
 */
const getAlertHistory = async (req, res) => {
    const { driverId } = req.params;
    const { limit = 10 } = req.query;

    if (!driverId) {
        return res.status(400).json({ error: 'Missing driverId' });
    }

    try {
        const alertsSnapshot = await db.collection(COLLECTIONS.EMERGENCY_ALERTS)
            .where('driverId', '==', driverId)
            .orderBy('timestamp', 'desc')
            .limit(parseInt(limit))
            .get();

        const alerts = alertsSnapshot.docs.map(doc => doc.data());

        res.status(200).json({ success: true, alerts });

    } catch (error) {
        console.error('Error fetching alert history:', error);
        res.status(500).json({ error: 'Failed to fetch alert history', details: error.message });
    }
};

module.exports = {
    triggerSOS,
    getAlertHistory,
};
