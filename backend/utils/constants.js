// utils/constants.js - Application constants

// User roles
const ROLES = {
    DRIVER: 'driver',
    PARENT: 'parent',
    ADMIN: 'admin',
};

// Firestore collection names
const COLLECTIONS = {
    DRIVERS: 'drivers',
    PARENTS: 'parents',
    CHILDREN: 'children',
    TRIPS: 'trips',
    VANS: 'vans',
    RATINGS: 'ratings',
    EMERGENCY_ALERTS: 'emergencyAlerts',
    ABSENCES: 'absences',
};

// Trip statuses
const TRIP_STATUS = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};

// Alert statuses
const ALERT_STATUS = {
    SENT: 'sent',
    PARTIALLY_SENT: 'partially_sent',
    FAILED: 'failed',
};

// Notification types
const NOTIFICATION_TYPES = {
    EMERGENCY: 'EMERGENCY',
    PROXIMITY: 'PROXIMITY',
    TRIP_START: 'TRIP_START',
    TRIP_END: 'TRIP_END',
    CHILD_PICKED: 'CHILD_PICKED',
    CHILD_DROPPED: 'CHILD_DROPPED',
    ABSENCE_CONFIRMED: 'ABSENCE_CONFIRMED',
};

// Absence types
const ABSENCE_TYPES = {
    FULL_DAY: 'full_day',
    MORNING_ONLY: 'morning_only',
    EVENING_ONLY: 'evening_only',
};

module.exports = {
    ROLES,
    COLLECTIONS,
    TRIP_STATUS,
    ALERT_STATUS,
    NOTIFICATION_TYPES,
    ABSENCE_TYPES,
};
