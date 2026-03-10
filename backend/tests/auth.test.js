const request = require('supertest');

// Fully inlined mocks to avoid any hoisting/scoping issues
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: () => ({
        collection: jest.fn().mockReturnThis(),
        doc: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        get: jest.fn(),
        set: jest.fn(),
        add: jest.fn(),
        update: jest.fn(),
    }),
}));

jest.mock('../config/firebase', () => {
    const collectionMock = jest.fn().mockReturnThis();
    const docMock = jest.fn().mockReturnThis();
    // We need these to be accessible to override behaviors
    // attaching them to the exported object is a hack but might work for simple tests
    // or we just re-require the module in the test to get the mock handles
    return {
        db: {
            collection: collectionMock,
            doc: docMock,
        },
        admin: {
            firestore: { FieldValue: { serverTimestamp: jest.fn() } },
            messaging: jest.fn().mockReturnValue({ send: jest.fn() }),
        },
    };
});

const app = require('../server');
// Get handles to the mocks
const { db } = require('../config/firebase');

describe('Auth API Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default chain behavior
        // db.collection is the mock function
        const mockGet = jest.fn();
        const mockSet = jest.fn();

        // We need to re-implement the chain explicitly because the inlined mock above loses state
        // when we re-require.
        // Actually, jest.mock factory only runs once. 'db' imported here IS the object returned above.

        // Helper to setup the chain
        db.collection.mockReturnValue({
            where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                    get: mockGet
                }),
                get: mockGet
            }),
            doc: jest.fn().mockReturnValue({
                set: mockSet,
                get: mockGet,
                update: jest.fn()
            }),
            add: jest.fn()
        });

        // Expose mocks for tests
        db.mockGet = mockGet; // attach to db object for easy access
        db.mockSet = mockSet;
    });

    describe('POST /api/auth/register', () => {
        it('should register a new user successfully', async () => {
            // User does not exist
            db.mockGet.mockResolvedValueOnce({ empty: true });
            // Set succeeds
            db.mockSet.mockResolvedValueOnce({});

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    role: 'parent',
                    name: 'Test Parent'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
        });

        it('should fail if email already exists', async () => {
            // User exists
            db.mockGet.mockResolvedValueOnce({ empty: false, docs: [{ data: () => ({}) }] });

            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'existing@example.com',
                    password: 'password123',
                    role: 'driver',
                    name: 'Test Driver'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body.error).toBe('Email already exists');
        });
    });
});
