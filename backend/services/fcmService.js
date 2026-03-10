// services/fcmService.js - Firebase Cloud Messaging service
const { admin } = require('../config/firebase');

/**
 * Send FCM notification to single device
 * @param {string} fcmToken - FCM device token
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Custom data payload
 * @returns {Object} - Result of the send operation
 */
const sendFCMNotification = async (fcmToken, title, body, data = {}) => {
    if (!fcmToken) {
        console.log('No FCM token provided');
        return { success: false, error: 'No token' };
    }

    const message = {
        token: fcmToken,
        notification: {
            title: title,
            body: body,
        },
        data: {
            ...Object.fromEntries(
                Object.entries(data).map(([key, value]) => [key, String(value)])
            ),
            click_action: 'FLUTTER_NOTIFICATION_CLICK', // For handling notification clicks
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'emergency_alerts', // Define this channel in your app
                priority: 'max',
                defaultSound: true,
                defaultVibrateTimings: true,
                visibility: 'public',
            },
        },
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('FCM notification sent:', response);
        return { success: true, messageId: response };
    } catch (error) {
        console.error('FCM send error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send FCM notification to multiple devices
 * @param {Array} fcmTokens - Array of FCM device tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Custom data payload
 * @returns {Object} - { success: number, failures: number, results: Array }
 */
const sendFCMToMultiple = async (fcmTokens, title, body, data = {}) => {
    if (!fcmTokens || fcmTokens.length === 0) {
        console.log('No FCM tokens provided');
        return { success: 0, failures: 0, results: [] };
    }

    // Filter out invalid tokens
    const validTokens = fcmTokens.filter(token => token && typeof token === 'string');

    if (validTokens.length === 0) {
        return { success: 0, failures: 0, results: [] };
    }

    // Convert data values to strings (FCM requirement)
    const stringData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, String(value)])
    );

    const message = {
        notification: {
            title: title,
            body: body,
        },
        data: {
            ...stringData,
            click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        android: {
            priority: 'high',
            notification: {
                channelId: 'emergency_alerts',
                priority: 'max',
                defaultSound: true,
                defaultVibrateTimings: true,
                visibility: 'public',
            },
        },
        tokens: validTokens, // Send to multiple tokens
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`FCM multicast: ${response.successCount} success, ${response.failureCount} failures`);

        // Log any failures for debugging
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    console.error(`Failed to send to token ${idx}:`, resp.error?.message);
                }
            });
        }

        return {
            success: response.successCount,
            failures: response.failureCount,
            results: response.responses,
        };
    } catch (error) {
        console.error('FCM multicast error:', error);
        return { success: 0, failures: validTokens.length, results: [], error: error.message };
    }
};

/**
 * Send emergency SOS notification via FCM
 * @param {Array} fcmTokens - Array of parent FCM tokens
 * @param {string} driverId - Driver who triggered the SOS
 * @param {string} driverName - Driver's name
 * @param {string} message - Emergency message
 * @param {Object} location - { latitude, longitude }
 * @returns {Object} - Result of the operation
 */
const sendSOSNotification = async (fcmTokens, driverId, driverName, message, location = null) => {
    const title = '🚨 EMERGENCY ALERT!';
    const body = message || `${driverName || 'Driver'} has triggered an emergency alert!`;

    const data = {
        type: 'EMERGENCY',
        driverId: driverId,
        driverName: driverName || 'Driver',
        timestamp: new Date().toISOString(),
        hasLocation: location ? 'true' : 'false',
    };

    if (location) {
        data.latitude = location.latitude;
        data.longitude = location.longitude;
    }

    return sendFCMToMultiple(fcmTokens, title, body, data);
};

/**
 * Send proximity alert notification via FCM
 * @param {string} fcmToken - Parent's FCM token
 * @param {string} childName - Child's name
 * @param {number} estimatedMinutes - ETA in minutes
 * @param {string} locationType - 'school' or 'home'
 */
const sendProximityAlert = async (fcmToken, childName, estimatedMinutes, locationType = 'home') => {
    const title = `🚐 Van Approaching ${locationType === 'school' ? 'School' : 'Home'}`;
    const body = `${childName}'s van will arrive in approximately ${estimatedMinutes} minutes`;

    return sendFCMNotification(fcmToken, title, body, {
        type: 'PROXIMITY',
        locationType,
        estimatedMinutes,
    });
};

/**
 * Send child pickup/dropoff notification via FCM
 * @param {string} fcmToken - Parent's FCM token
 * @param {string} childName - Child's name
 * @param {string} action - 'picked' or 'dropped'
 */
const sendChildStatusAlert = async (fcmToken, childName, action) => {
    const title = action === 'picked' ? '✅ Child Picked Up' : '🏠 Child Dropped Off';
    const body = action === 'picked'
        ? `${childName} has been picked up by the van`
        : `${childName} has been safely dropped off`;

    return sendFCMNotification(fcmToken, title, body, {
        type: action === 'picked' ? 'CHILD_PICKED' : 'CHILD_DROPPED',
        childName,
    });
};

module.exports = {
    sendFCMNotification,
    sendFCMToMultiple,
    sendSOSNotification,
    sendProximityAlert,
    sendChildStatusAlert,
};
