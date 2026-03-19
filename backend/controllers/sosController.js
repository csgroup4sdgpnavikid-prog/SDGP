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

    // Ownership check — token uid must match the driverId in the request
    if (!driverId) {
        return res.status(400).json({ error: 'Missing required field: driverId' });
    }
    if (req.user.uid !== driverId) {
        return res.status(403).json({ error: 'Forbidden: token uid does not match driverId.' });
    }
    console.log('Received SOS request:', { driverId, message });

    try {
        // Fetch driver document from Firestore
        const driverDoc = await db.collection(COLLECTIONS.DRIVERS).doc(driverId).get();

        if (!driverDoc.exists) {
            console.error(`Driver document not found for ID: ${driverId}`);
            return res.status(404).json({ error: 'Driver not found' });
        }

        const driverData = driverDoc.data();
        console.log('Driver data found:', driverData);

        // Get parent IDs from driver's associatedParentIds array
        const associatedParentIds = driverData.associatedParentIds || [];

        // Also query parents by assignedDriverId field — catches any parent not yet in the array
        const assignedParentsSnap = await db.collection(COLLECTIONS.PARENTS)
            .where('assignedDriverId', '==', driverId)
            .get();
        const assignedParentIds = assignedParentsSnap.docs.map(d => d.id);

        // Union of both sets (deduplicated)
        const allParentIds = [...new Set([...associatedParentIds, ...assignedParentIds])];

        if (allParentIds.length === 0) {
            console.warn(`No parents associated with driver ID: ${driverId}`);
            return res.status(404).json({ error: 'No parents associated with this driver' });
        }

        console.log(`Found ${allParentIds.length} parent(s) for driver ${driverId} (${associatedParentIds.length} from array, ${assignedParentIds.length} from query)`);

        // Fetch Expo tokens for all parents
        const parentDocs = await Promise.all(
            allParentIds.map(parentId =>
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
            type: 'sos',
            parentIds: allParentIds,
            message: message || 'Emergency triggered by driver.',
            location: location || null,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: alertStatus,
            notificationsSent: result.success,
            notificationsFailed: result.errors,
            acknowledgedBy: null,
            acknowledgedAt: null,
            resolvedAt: null,
        });

        console.log(`Emergency alert logged in Firestore with ID: ${alertRef.id}`);

        res.status(200).json({
            success: true,
            message: 'SOS alert sent',
            parentsNotified: result.success,   // used by DriverAlert.tsx
            sentToCount: result.success,
            failedCount: result.errors,
            loggedAlertId: alertRef.id,
        });

    } catch (error) {
        console.error('Error processing SOS request:', error);
        res.status(500).json({ error: 'Internal server error while processing SOS' });
    }
};

module.exports = { triggerSOS };
