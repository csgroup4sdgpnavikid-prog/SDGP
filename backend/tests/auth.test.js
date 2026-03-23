const request = require('supertest');

// Mock firebase-admin before requiring anything else
jest.mock('firebase-admin', () => {
    const firestoreMock = {
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
        set: jest.fn(),
        add: jest.fn(),
        update: jest.fn(),
        settings: jest.fn(),
    };
    return {
        initializeApp: jest.fn(),
        credential: { cert: jest.fn() },
        firestore: Object.assign(() => firestoreMock, {
            FieldValue: { serverTimestamp: jest.fn() },
        }),
    };
});

jest.mock('../config/firebase', () => {
    const collectionMock = jest.fn().mockReturnThis();
    const docMock = jest.fn().mockReturnThis();
    return {
        db: {
            collection: collectionMock,
            doc: docMock,
            settings: jest.fn(),
        },
        admin: {
            firestore: { FieldValue: { serverTimestamp: jest.fn() } },
            auth: jest.fn().mockReturnValue({
                verifyIdToken: jest.fn(),
            }),
        },
    };
});

const app = require('../server');
const { admin, db } = require('../config/firebase');

describe('API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('GET /api/health', () => {
        it('should return 200 with status OK', async () => {
            const res = await request(app).get('/api/health');

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('OK');
            expect(res.body.message).toBe('Server is running');
            expect(res.body).toHaveProperty('timestamp');
        });
    });

    describe('POST /api/trips/start (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/trips/start')
                .send({ driverId: 'test-driver' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/absence/mark (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/absence/mark')
                .send({ childId: 'test-child', date: '2026-03-19', absenceType: 'full_day' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/sos/trigger (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/sos/trigger')
                .send({ driverId: 'test-driver', message: 'Test alert' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('Authentication middleware', () => {
        it('should reject requests with invalid token format', async () => {
            const res = await request(app)
                .post('/api/trips/start')
                .set('Authorization', 'InvalidToken')
                .send({ driverId: 'test-driver' });

            expect(res.statusCode).toEqual(401);
        });

        it('should reject requests with expired/invalid bearer token', async () => {
            // Mock verifyIdToken to throw
            admin.auth().verifyIdToken.mockRejectedValueOnce(new Error('Token expired'));

            const res = await request(app)
                .post('/api/trips/start')
                .set('Authorization', 'Bearer fake-expired-token')
                .send({ driverId: 'test-driver' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /nonexistent-route', () => {
        it('should return 404 for unknown routes', async () => {
            const res = await request(app).get('/api/nonexistent');

            expect(res.statusCode).toEqual(404);
        });
    });

    // ── New Test Cases ──────────────────────────────────────────────────────

    describe('POST /api/trips/end (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/trips/end')
                .send({ tripId: 'test-trip' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/trips/update-stop (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/trips/update-stop')
                .send({ tripId: 'test-trip', stopIndex: 0, status: 'picked' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('POST /api/absence/confirm (without auth)', () => {
        it('should return 401 when no auth token is provided', async () => {
            const res = await request(app)
                .post('/api/absence/confirm')
                .send({ absenceId: 'test-absence' });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET / (root endpoint)', () => {
        it('should return 200 with NaviKid API status', async () => {
            const res = await request(app).get('/');

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('ok');
            expect(res.body.message).toBe('NaviKid API is running.');
        });
    });

    describe('POST /api/trips/start (authenticated, driver not found)', () => {
        it('should return 404 when driver document does not exist', async () => {
            // Mock valid token
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'driver-1',
                email: 'driver@test.com',
                role: 'driver',
            });

            // Build a chainable Firestore mock with where/limit support
            const getMock = jest.fn()
                .mockResolvedValueOnce({ empty: true })   // getActiveTrip → no active trip
                .mockResolvedValueOnce({ exists: false }); // driver doc → not found
            const chainable = {
                collection: jest.fn().mockReturnThis(),
                doc: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                limit: jest.fn().mockReturnThis(),
                get: getMock,
            };
            db.collection.mockImplementation(() => chainable);

            const res = await request(app)
                .post('/api/trips/start')
                .set('Authorization', 'Bearer valid-token')
                .send({ tripType: 'morning' });

            expect(res.statusCode).toEqual(404);
            expect(res.body.error).toBe('Driver not found');
        });
    });

    describe('POST /api/sos/trigger (ownership check)', () => {
        it('should return 403 when token uid does not match driverId', async () => {
            // Mock valid token with uid 'user-1'
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'user-1',
                email: 'user1@test.com',
                role: 'driver',
            });

            const res = await request(app)
                .post('/api/sos/trigger')
                .set('Authorization', 'Bearer valid-token')
                .send({ driverId: 'different-user', message: 'Test alert' });

            expect(res.statusCode).toEqual(403);
            expect(res.body.error).toBe('Forbidden: token uid does not match driverId.');
        });
    });

    describe('POST /api/absence/mark (validation)', () => {
        it('should return 400 when required fields are missing', async () => {
            // Mock valid token
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'parent-1',
                email: 'parent@test.com',
                role: 'parent',
            });

            const res = await request(app)
                .post('/api/absence/mark')
                .set('Authorization', 'Bearer valid-token')
                .send({}); // missing childId, date, absenceType

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toMatch(/Missing required fields/);
        });
    });

    describe('POST /api/absence/confirm (validation)', () => {
        it('should return 400 when absenceId is missing', async () => {
            // Mock valid token
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'parent-1',
                email: 'parent@test.com',
                role: 'parent',
            });

            const res = await request(app)
                .post('/api/absence/confirm')
                .set('Authorization', 'Bearer valid-token')
                .send({}); // missing absenceId

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Missing required field: absenceId');
        });
    });

    // ── Additional Test Cases ───────────────────────────────────────────────

    describe('POST /api/sos/trigger (missing driverId)', () => {
        it('should return 400 when driverId is missing from body', async () => {
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'driver-1',
                email: 'driver@test.com',
                role: 'driver',
            });

            const res = await request(app)
                .post('/api/sos/trigger')
                .set('Authorization', 'Bearer valid-token')
                .send({ message: 'Emergency!' }); // missing driverId

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Missing required field: driverId');
        });
    });

    describe('POST /api/absence/mark (invalid absenceType)', () => {
        it('should return 400 for invalid absence type', async () => {
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'parent-1',
                email: 'parent@test.com',
                role: 'parent',
            });

            const res = await request(app)
                .post('/api/absence/mark')
                .set('Authorization', 'Bearer valid-token')
                .send({ childId: 'child-1', date: '2026-12-25', absenceType: 'invalid_type' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toMatch(/Invalid absenceType/);
        });
    });

    describe('POST /api/absence/mark (invalid date format)', () => {
        it('should return 400 for invalid date format', async () => {
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'parent-1',
                email: 'parent@test.com',
                role: 'parent',
            });

            const res = await request(app)
                .post('/api/absence/mark')
                .set('Authorization', 'Bearer valid-token')
                .send({ childId: 'child-1', date: '25/12/2026', absenceType: 'full_day' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toMatch(/Invalid date/);
        });
    });

    describe('POST /api/absence/mark (past date)', () => {
        it('should return 400 when marking absence for a past date', async () => {
            admin.auth().verifyIdToken.mockResolvedValueOnce({
                uid: 'parent-1',
                email: 'parent@test.com',
                role: 'parent',
            });

            const res = await request(app)
                .post('/api/absence/mark')
                .set('Authorization', 'Bearer valid-token')
                .send({ childId: 'child-1', date: '2020-01-01', absenceType: 'full_day' });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Cannot mark absence for a past date.');
        });
    });

    describe('Security headers', () => {
        it('should include security headers in response', async () => {
            const res = await request(app).get('/api/health');

            expect(res.headers['x-content-type-options']).toBe('nosniff');
            expect(res.headers['x-frame-options']).toBe('DENY');
            expect(res.headers['x-xss-protection']).toBe('1; mode=block');
            expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
        });
    });
});
