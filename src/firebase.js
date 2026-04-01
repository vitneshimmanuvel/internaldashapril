import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "./utils/api";

const firebaseConfig = {
  apiKey: "AIzaSyCGmT2THXqv6PQgBU-Sja15heG8oP21ti8",
  authDomain: "leadentry-5bb69.firebaseapp.com",
  projectId: "leadentry-5bb69",
  storageBucket: "leadentry-5bb69.firebasestorage.app",
  messagingSenderId: "331369272423",
  appId: "1:331369272423:web:0728183a3d544a4533f0c2",
  measurementId: "G-PKKPVHX135"
};

export const app = initializeApp(firebaseConfig);

export const setupFCM = async () => {
  try {
    const messaging = getMessaging(app);
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { 
        // VAPID key is optional here if provided in console, or fallback
        // We will try to get it, if it fails, the user must provide a vapidKey
      });
      if (currentToken) {
        await api.put('/users/me/fcm-token', { token: currentToken });
        console.log("FCM Token registered");
      }
    }
    
    // Listen to foreground messages
    onMessage(messaging, (payload) => {
      console.log('FCM Foreground message: ', payload);
      // We can use hot-toast to show it in-app since background will use system notifications
      if (window.showFcmToast) {
        window.showFcmToast(payload);
      }
    });
  } catch (error) {
    console.warn("FCM setup failed. VapidKey might be missing or notifications blocked.", error);
  }
};
