// auth/authController.js - Login and Registration Logic
const { db } = require('../config/firebase');
const { COLLECTIONS, ROLES } = require('../utils/constants');
const { validateRequiredFields, isValidRole } = require('../utils/validators');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Secret key for signing JWTs (should be in .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-default-secret-key-change-this';
const JWT_EXPIRES_IN = '7d'; // Token valid for 7 days

/**
 * Register a new user (Parent or Driver)
 * POST /api/auth/register
 */
const register = async (req, res) => {
    const { email, password, role, name, phone, ...otherData } = req.body;

    // Validate required fields
    const validation = validateRequiredFields(req.body, ['email', 'password', 'role', 'name']);
    if (!validation.isValid) {
        return res.status(400).json({ error: `Missing required fields: ${validation.missingFields.join(', ')}` });
    }

    if (!isValidRole(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "driver" or "parent".' });
    }

    try {
        const collection = role === ROLES.DRIVER ? COLLECTIONS.DRIVERS : COLLECTIONS.PARENTS;

        // Check if user already exists
        const snapshot = await db.collection(collection).where('email', '==', email).limit(1).get();
        if (!snapshot.empty) {
            return res.status(400).json({ error: 'Email already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create user document
        const userRef = db.collection(collection).doc();
        const userId = userRef.id;

        const userData = {
            userId,
            email,
            password: hashedPassword, // Store hashed password
            role,
            name,
            phone: phone || null,
            createdAt: new Date().toISOString(),
            ...otherData,
        };

        await userRef.set(userData);

        // Generate JWT token
        const token = jwt.sign({ userId, role, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        // Return success (exclude password)
        delete userData.password;

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: userData,
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to register user', details: error.message });
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
        return res.status(400).json({ error: 'Missing email, password, or role' });
    }

    try {
        const collection = role === ROLES.DRIVER ? COLLECTIONS.DRIVERS : COLLECTIONS.PARENTS;

        // Find user by email
        const snapshot = await db.collection(collection).where('email', '==', email).limit(1).get();

        if (snapshot.empty) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();

        // Verify password
        const isMatch = await bcrypt.compare(password, userData.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: userData.userId, role: userData.role, email: userData.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Return success (exclude password)
        const safeUser = { ...userData };
        delete safeUser.password;

        res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: safeUser,
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Failed to login', details: error.message });
    }
};

module.exports = { register, login };
