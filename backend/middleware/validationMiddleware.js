// middleware/validationMiddleware.js - Request validation middleware
const { validateRequiredFields, isValidLocation, isValidRole } = require('../utils/validators');

/**
 * Validate request body has required fields
 * @param {Array} requiredFields - Array of required field names
 */
const validateBody = (requiredFields) => {
    return (req, res, next) => {
        const validation = validateRequiredFields(req.body, requiredFields);

        if (!validation.isValid) {
            return res.status(400).json({
                error: `Missing required fields: ${validation.missingFields.join(', ')}`
            });
        }

        next();
    };
};

/**
 * Validate location in request body
 */
const validateLocationBody = (req, res, next) => {
    const { location, latitude, longitude } = req.body;

    // Check for location object or separate lat/lng
    if (location) {
        if (!isValidLocation(location)) {
            return res.status(400).json({ error: 'Invalid location format' });
        }
    } else if (latitude !== undefined && longitude !== undefined) {
        if (!isValidLocation({ latitude, longitude })) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }
    }

    next();
};

/**
 * Validate role in request body
 */
const validateRoleBody = (req, res, next) => {
    const { role } = req.body;

    if (role && !isValidRole(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "driver" or "parent".' });
    }

    next();
};

module.exports = {
    validateBody,
    validateLocationBody,
    validateRoleBody,
};
