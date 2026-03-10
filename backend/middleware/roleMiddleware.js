// middleware/roleMiddleware.js - Role-based access control
const { ROLES } = require('../utils/constants');

/**
 * Require specific role(s) to access route
 * @param {string|Array} allowedRoles - Role or array of roles allowed
 */
const requireRole = (allowedRoles) => {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    return (req, res, next) => {
        const userRole = req.userRole;

        if (!userRole) {
            return res.status(403).json({ error: 'Forbidden: Role not specified' });
        }

        if (!roles.includes(userRole)) {
            return res.status(403).json({
                error: `Forbidden: This action requires ${roles.join(' or ')} role`
            });
        }

        next();
    };
};

/**
 * Require driver role
 */
const requireDriver = requireRole(ROLES.DRIVER);

/**
 * Require parent role
 */
const requireParent = requireRole(ROLES.PARENT);

/**
 * Allow both driver and parent
 */
const requireDriverOrParent = requireRole([ROLES.DRIVER, ROLES.PARENT]);

module.exports = {
    requireRole,
    requireDriver,
    requireParent,
    requireDriverOrParent,
};
