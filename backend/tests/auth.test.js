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
const { admin } = require('../config/firebase');

describe('API Endpoints', () => {
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
});
