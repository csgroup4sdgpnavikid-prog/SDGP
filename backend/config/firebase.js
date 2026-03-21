// config/firebase.js - Firebase Admin SDK & Firestore initialization
const admin = require('firebase-admin');

// Use environment variables for security (loaded from .env file)
let privateKey = process.env.FIREBASE_PRIVATE_KEY || '';
// Strip surrounding quotes if present
privateKey = privateKey.replace(/^"(.*)"$/, '$1');
// Convert literal \n to actual newlines
privateKey = privateKey.replace(/\\n/g, '\n');

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
};

// Initialize the Firebase Admin SDK with the service account details
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// Get a reference to the Firestore database
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = { admin, db };
