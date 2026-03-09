// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDJOtHU6FY4WosW_exH1q-CN6JyU0OmXZI",
  authDomain: "navi-kid-school-van-tracker.firebaseapp.com",
  projectId: "navi-kid-school-van-tracker",
  storageBucket: "navi-kid-school-van-tracker.firebasestorage.app",
  messagingSenderId: "997311667098",
  appId: "1:997311667098:web:8074b1381220c37cbe7823",
  measurementId: "G-8MP3BEFT1C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
