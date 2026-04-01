// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCGmT2THXqv6PQgBU-Sja15heG8oP21ti8",
  authDomain: "leadentry-5bb69.firebaseapp.com",
  projectId: "leadentry-5bb69",
  storageBucket: "leadentry-5bb69.firebasestorage.app",
  messagingSenderId: "331369272423",
  appId: "1:331369272423:web:3d0d48a5d1c39c9c33f0c2",
  measurementId: "G-N4MPBQNSBC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export default app;
