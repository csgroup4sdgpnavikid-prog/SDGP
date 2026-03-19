import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// [NEW] Import Auth with Side Effect for Registration
import 'firebase/auth'; // Ensure side-effects run
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID!,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
// Use standard getAuth for now to ensure we have a valid instance.
// Persistence warnings will appear in Expo Go but app will function.
const auth = getAuth(app);

// Attempt to set persistence if possible, but don't block auth object creation
try {
  // Optional: You can try to initialize with persistence here if needed,
  // but for Expo Go debugging, getAuth() is safest.
  // initializeAuth would need to be the *first* call, which risks failure.
} catch (e) {
  console.warn("Auth persistence config warning:", e);
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

export { app, auth, db, storage };
