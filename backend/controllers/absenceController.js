// controllers/absenceController.js - Absence management logic
const { db, admin } = require('../config/firebase');
const { COLLECTIONS, ABSENCE_TYPES } = require('../utils/constants');
const { validateRequiredFields } = require('../utils/validators');

/**
 * Mark child as absent
 * POST /api/absence/mark
 */
const markAbsence = async (req, res) => {
    const { parentId, childId, driverId, date, absenceType } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['parentId', 'childId', 'date', 'absenceType']);
    if (!validation.isValid) {
        return res.status(400).json({
            error: `Missing required fields: ${validation.missingFields.join(', ')}`
        });
    }

    // Validate absence type
    if (!Object.values(ABSENCE_TYPES).includes(absenceType)) {
        return res.status(400).json({
            error: `Invalid absenceType. Must be one of: ${Object.values(ABSENCE_TYPES).join(', ')}`
        });
    }

    try {
        // Verify parent owns this child (controlled access)
        const childDoc = await db.collection(COLLECTIONS.CHILDREN).doc(childId).get();
        if (!childDoc.exists) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const childData = childDoc.data();
        if (childData.parentId !== parentId) {
            return res.status(403).json({ error: 'Access denied. You can only mark absence for your own child.' });
        }

        // Create absence record
        const absenceRef = db.collection(COLLECTIONS.ABSENCES).doc();
        const absenceDate = new Date(date);
        absenceDate.setHours(0, 0, 0, 0);

        const absenceData = {
            absenceId: absenceRef.id,
            parentId,
            childId,
            childName: childData.name || null,
            driverId: driverId || childData.driverId,
            date: absenceDate,
            absenceType,
            status: 'pending', // pending, confirmed, cancelled
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            confirmedAt: null,
        };

        await absenceRef.set(absenceData);

        console.log(`Absence marked for child ${childId} on ${date}: ${absenceType}`);

        res.status(200).json({
            success: true,
            message: 'Absence marked. Please confirm to finalize.',
            absence: absenceData,
            absenceId: absenceRef.id,
        });

    } catch (error) {
        console.error('Error marking absence:', error);
        res.status(500).json({ error: 'Failed to mark absence', details: error.message });
    }
};

/**
 * Confirm absence (double-check system)
 * POST /api/absence/confirm
 */
const confirmAbsence = async (req, res) => {
    const { absenceId, parentId } = req.body;

    if (!absenceId || !parentId) {
        return res.status(400).json({ error: 'Missing required fields: absenceId, parentId' });
    }

    try {
        const absenceRef = db.collection(COLLECTIONS.ABSENCES).doc(absenceId);
        const absenceDoc = await absenceRef.get();

        if (!absenceDoc.exists) {
            return res.status(404).json({ error: 'Absence record not found' });
        }

        const absenceData = absenceDoc.data();

        // Verify parent owns this absence
        if (absenceData.parentId !== parentId) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        if (absenceData.status === 'confirmed') {
            return res.status(400).json({ error: 'Absence already confirmed' });
        }

        // Confirm the absence
        await absenceRef.update({
            status: 'confirmed',
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Absence confirmed: ${absenceId}`);

        res.status(200).json({
            success: true,
            message: 'Absence confirmed. The route will be automatically optimized.',
            absenceId,
        });

    } catch (error) {
        console.error('Error confirming absence:', error);
        res.status(500).json({ error: 'Failed to confirm absence', details: error.message });
    }
};

/**
 * Cancel absence
 * POST /api/absence/cancel
 */
const cancelAbsence = async (req, res) => {
    const { absenceId, parentId } = req.body;

    if (!absenceId || !parentId) {
        return res.status(400).json({ error: 'Missing required fields: absenceId, parentId' });
    }

    try {
        const absenceRef = db.collection(COLLECTIONS.ABSENCES).doc(absenceId);
        const absenceDoc = await absenceRef.get();

        if (!absenceDoc.exists) {
            return res.status(404).json({ error: 'Absence record not found' });
        }

        const absenceData = absenceDoc.data();

        // Verify parent owns this absence
        if (absenceData.parentId !== parentId) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        // Update status to cancelled
        await absenceRef.update({
            status: 'cancelled',
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Absence cancelled: ${absenceId}`);

        res.status(200).json({
            success: true,
            message: 'Absence cancelled.',
            absenceId,
        });

    } catch (error) {
        console.error('Error cancelling absence:', error);
        res.status(500).json({ error: 'Failed to cancel absence', details: error.message });
    }
};

/**
 * Get absences for a child
 * GET /api/absence/child/:childId
 */
const getChildAbsences = async (req, res) => {
    const { childId } = req.params;
    const { parentId, startDate, endDate } = req.query;

    if (!childId) {
        return res.status(400).json({ error: 'Missing childId' });
    }

    try {
        // Verify parent access if parentId provided
        if (parentId) {
            const childDoc = await db.collection(COLLECTIONS.CHILDREN).doc(childId).get();
            if (childDoc.exists && childDoc.data().parentId !== parentId) {
                return res.status(403).json({ error: 'Access denied.' });
            }
        }

        let query = db.collection(COLLECTIONS.ABSENCES).where('childId', '==', childId);

        // Add date filters if provided
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            query = query.where('date', '>=', start);
        }

        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query = query.where('date', '<=', end);
        }

        const absencesSnapshot = await query.orderBy('date', 'desc').get();
        const absences = absencesSnapshot.docs.map(doc => doc.data());

        res.status(200).json({ success: true, absences });

    } catch (error) {
        console.error('Error fetching absences:', error);
        res.status(500).json({ error: 'Failed to fetch absences', details: error.message });
    }
};

module.exports = {
    markAbsence,
    confirmAbsence,
    cancelAbsence,
    getChildAbsences,
};
