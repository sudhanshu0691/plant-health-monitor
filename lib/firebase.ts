// lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, query, orderBy, limit, getDocs, Firestore } from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyA6eMRWlBYngy93eYqy5BQcfBnAkow8RKY",
  authDomain: "agro-iot-data.firebaseapp.com",
  projectId: "agro-iot-data",
  storageBucket: "agro-iot-data.firebasestorage.app",
  messagingSenderId: "1068979240622",
  appId: "1:1068979240622:web:6dfebb586976096702f73f",
  measurementId: "G-XG8L65MMYY"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore
const db: Firestore = getFirestore(app);

// Initialize Analytics (only on client side)
let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { db, collection, onSnapshot, query, orderBy, limit, getDocs, analytics };
export default app;
