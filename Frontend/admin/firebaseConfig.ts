import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// [NEW] Import Auth with Side Effect for Registration
import 'firebase/auth'; // Ensure side-effects run
import { initializeAuth, getAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDJOtHU6FY4WosW_exH1q-CN6JyU0OmXZI",
  authDomain: "navi-kid-school-van-tracker.firebaseapp.com",
  projectId: "navi-kid-school-van-tracker",
  storageBucket: "navi-kid-school-van-tracker.firebasestorage.app",
  messagingSenderId: "997311667098",
  appId: "1:997311667098:web:8074b1381220c37cbe7823",
  measurementId: "G-8MP3BEFT1C"
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

export { app, auth, db };
