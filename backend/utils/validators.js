// utils/validators.js - Input validation helpers
const { ROLES } = require('./constants');

/**
 * Validate required fields in request body
 * @param {Object} body - Request body
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} - { isValid: boolean, missingFields: Array }
 */
const validateRequiredFields = (body, requiredFields) => {
    const missingFields = requiredFields.filter(field => !body[field]);
    return {
        isValid: missingFields.length === 0,
        missingFields,
    };
};

/**
 * Validate user role
 * @param {string} role - Role to validate
 * @returns {boolean}
 */
const isValidRole = (role) => {
    return Object.values(ROLES).includes(role);
};

/**
 * Validate GPS coordinates
 * @param {number} latitude - Latitude value
 * @param {number} longitude - Longitude value
 * @returns {boolean}
 */
const isValidCoordinates = (latitude, longitude) => {
    return (
        typeof latitude === 'number' &&
        typeof longitude === 'number' &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
    );
};

/**
 * Validate location object
 * @param {Object} location - { latitude, longitude }
 * @returns {boolean}
 */
const isValidLocation = (location) => {
    if (!location || typeof location !== 'object') return false;
    return isValidCoordinates(location.latitude, location.longitude);
};

module.exports = {
    validateRequiredFields,
    isValidRole,
    isValidCoordinates,
    isValidLocation,
};
