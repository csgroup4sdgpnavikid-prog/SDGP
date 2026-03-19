// controllers/absenceController.js - Absence management logic
const { db, admin } = require('../config/firebase');
const { COLLECTIONS, ABSENCE_TYPES } = require('../utils/constants');
const { validateRequiredFields } = require('../utils/validators');

/** Validate YYYY-MM-DD format and return a UTC Date at midnight, or null if invalid */
function parseISODate(dateStr) {
    if (typeof dateStr !== 'string') return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
    const [year, month, day] = dateStr.split('-').map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

function todayUTC() {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

/**
 * Mark child as absent
 * POST /api/absence/mark
 */
const markAbsence = async (req, res) => {
    const { childId, driverId, date, absenceType } = req.body;
    // Always derive parentId from the verified token — never trust body
    const parentId = req.user.uid;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['childId', 'date', 'absenceType']);
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

    // Validate and parse date as ISO YYYY-MM-DD (UTC midnight — timezone-safe)
    const absenceDate = parseISODate(date);
    if (!absenceDate) {
        return res.status(400).json({ error: 'Invalid date. Must be ISO format: YYYY-MM-DD (e.g. 2024-03-18)' });
    }

    // Prevent marking absences for past dates
    if (absenceDate < todayUTC()) {
        return res.status(400).json({ error: 'Cannot mark absence for a past date.' });
    }

    try {
        // Children live at parents/{parentId}/children/{childId} — subcollection
        // Ownership is guaranteed by the subcollection path (parentId is from the verified token)
        const childDoc = await db.collection(COLLECTIONS.PARENTS).doc(parentId)
            .collection('children').doc(childId).get();
        if (!childDoc.exists) {
            return res.status(404).json({ error: 'Child not found' });
        }

        const childData = childDoc.data();

        // Create absence record
        const absenceRef = db.collection(COLLECTIONS.ABSENCES).doc();

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
        res.status(500).json({ error: 'Failed to mark absence' });
    }
};

/**
 * Confirm absence (double-check system)
 * POST /api/absence/confirm
 */
const confirmAbsence = async (req, res) => {
    const { absenceId } = req.body;
    // Use token UID — never trust parentId from request body
    const parentId = req.user.uid;

    if (!absenceId) {
        return res.status(400).json({ error: 'Missing required field: absenceId' });
    }

    try {
        const absenceRef = db.collection(COLLECTIONS.ABSENCES).doc(absenceId);
        const absenceDoc = await absenceRef.get();

        if (!absenceDoc.exists) {
            return res.status(404).json({ error: 'Absence record not found' });
        }

        const absenceData = absenceDoc.data();

        // Verify parent owns this absence (using token UID)
        if (absenceData.parentId !== parentId) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        if (absenceData.status === 'confirmed') {
            return res.status(400).json({ error: 'Absence already confirmed' });
        }

        // Prevent confirming absences for past dates
        const absenceDate = absenceData.date?.toDate ? absenceData.date.toDate() : new Date(absenceData.date);
        if (absenceDate < todayUTC()) {
            return res.status(400).json({ error: 'Cannot confirm absence for a past date.' });
        }

        // Confirm the absence and update the child's isAbsent flag in the subcollection
        const batch = db.batch();

        batch.update(absenceRef, {
            status: 'confirmed',
            confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update child.isAbsent so DriverMap and studentService see the flag immediately
        if (absenceData.childId) {
            const childRef = db.collection(COLLECTIONS.PARENTS).doc(parentId)
                .collection('children').doc(absenceData.childId);
            batch.update(childRef, { isAbsent: true });
        }

        await batch.commit();

        console.log(`Absence confirmed: ${absenceId}`);

        res.status(200).json({
            success: true,
            message: 'Absence confirmed. The route will be automatically optimized.',
            absenceId,
        });

    } catch (error) {
        console.error('Error confirming absence:', error);
        res.status(500).json({ error: 'Failed to confirm absence' });
    }
};

module.exports = { markAbsence, confirmAbsence };
