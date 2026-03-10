// config/firebase.js - Firebase Admin SDK & Firestore initialization
const admin = require('firebase-admin');

// Use environment variables for security (loaded from .env file)
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize the Firebase Admin SDK with the service account details
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Get a reference to the Firestore database
const db = admin.firestore();

module.exports = { admin, db };
