// services/notificationService.js - Push notification service using Expo
const { expo, Expo } = require('../config/expo');

/**
 * Send push notifications to multiple Expo push tokens
 * @param {Array} tokens - Array of Expo push tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Object} - { success: number, errors: number, results: Array }
 */
const sendPushNotifications = async (tokens, title, body, data = {}) => {
    // Filter to only valid Expo tokens and build messages
    const messages = tokens
        .filter(token => token && Expo.isExpoPushToken(token))
        .map(token => ({
            to: token,
            sound: 'default',
            title: title,
            body: body,
            data: data,
        }));

    if (messages.length === 0) {
        console.log('No valid Expo tokens to send notifications to');
        return { success: 0, errors: 0, results: [] };
    }

    let ticketErrors = 0;
    let ticketSuccesses = 0;
    let ticketResults = [];

    try {
        // Send notifications in chunks (Expo SDK recommendation)
        const chunks = expo.chunkPushNotifications(messages);

        for (const chunk of chunks) {
            try {
                const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
                ticketResults.push(...ticketChunk);
                ticketSuccesses += ticketChunk.length;
            } catch (error) {
                console.error('Error sending chunk of notifications:', error);
                ticketErrors += chunk.length;
            }
        }

        console.log(`Notifications sent: ${ticketSuccesses} success, ${ticketErrors} errors`);
    } catch (error) {
        console.error('Error in sendPushNotifications:', error);
        ticketErrors = messages.length;
    }

    return {
        success: ticketSuccesses,
        errors: ticketErrors,
        results: ticketResults
    };
};

/**
 * Send proximity notification to a parent
 * @param {string} token - Parent's Expo push token
 * @param {string} childName - Name of the child
 * @param {string} locationType - 'school' or 'home'
 * @param {number} estimatedMinutes - Estimated time of arrival
 */
const sendProximityNotification = async (token, childName, locationType, estimatedMinutes) => {
    const title = `🚐 Van Approaching ${locationType === 'school' ? 'School' : 'Home'}`;
    const body = `${childName}'s van will arrive in approximately ${estimatedMinutes} minutes`;

    return sendPushNotifications(
        [token],
        title,
        body,
        {
            type: 'PROXIMITY',
            locationType,
            estimatedMinutes,
            timestamp: new Date().toISOString(),
        }
    );
};

/**
 * Send trip status notification
 * @param {Array} tokens - Array of parent tokens
 * @param {string} status - 'started' or 'ended'
 * @param {string} driverName - Name of the driver
 */
const sendTripStatusNotification = async (tokens, status, driverName) => {
    const title = status === 'started' ? '🚐 Trip Started' : '🏁 Trip Ended';
    const body = status === 'started'
        ? `${driverName} has started the trip. You can now track the van.`
        : `${driverName} has ended the trip.`;

    return sendPushNotifications(
        tokens,
        title,
        body,
        {
            type: status === 'started' ? 'TRIP_START' : 'TRIP_END',
            driverName,
            timestamp: new Date().toISOString(),
        }
    );
};

/**
 * Send child pickup/dropoff notification
 * @param {string} token - Parent's Expo push token
 * @param {string} childName - Name of the child
 * @param {string} action - 'picked' or 'dropped'
 */
const sendChildStatusNotification = async (token, childName, action) => {
    const title = action === 'picked' ? '✅ Child Picked Up' : '🏠 Child Dropped Off';
    const body = action === 'picked'
        ? `${childName} has been picked up by the van`
        : `${childName} has been safely dropped off`;

    return sendPushNotifications(
        [token],
        title,
        body,
        {
            type: action === 'picked' ? 'CHILD_PICKED' : 'CHILD_DROPPED',
            childName,
            timestamp: new Date().toISOString(),
        }
    );
};

module.exports = {
    sendPushNotifications,
    sendProximityNotification,
    sendTripStatusNotification,
    sendChildStatusNotification,
};
