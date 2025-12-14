// smart-q/src/firebase.js
import { initializeApp } from "firebase/app";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "smartq-cc87b.firebaseapp.com",
  projectId: "smartq-cc87b",
  storageBucket: "smartq-cc87b.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// messaging can be unsupported in some browsers (Safari, old mobile)
let messagingPromise = null;

export async function getMessagingSafe() {
  if (!(await isSupported())) {
    console.warn("[FCM] Browser does not support FCM");
    return null;
  }

  if (!messagingPromise) {
    messagingPromise = Promise.resolve(getMessaging(app));
  }

  return messagingPromise;
}
