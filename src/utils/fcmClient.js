// smart-q/src/utils/fcmClient.js
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingSafe } from "../firebase";

let foregroundListenerAttached = false;

// make sure SW is registered and active
async function ensureSw() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) {
    console.warn("[FCM] Service workers not supported");
    return null;
  }

  try {
    let reg = await navigator.serviceWorker.getRegistration(
      "/firebase-messaging-sw.js"
    );

    if (!reg) {
      console.log("[FCM] Registering firebase-messaging-sw.js ...");
      reg = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );
    }

    const readyReg = await navigator.serviceWorker.ready;
    console.log("[FCM] Service worker ready:", readyReg);
    return readyReg;
  } catch (err) {
    console.error("[FCM] SW registration failed:", err);
    return null;
  }
}

export async function requestFcmToken() {
  try {
    if (typeof window === "undefined") return null;
    if (!("Notification" in window)) {
      console.warn("[FCM] Notifications not supported");
      return null;
    }

    const messaging = await getMessagingSafe();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("[FCM] Notification permission:", permission);
      return null;
    }

    const swReg = await ensureSw();
    if (!swReg) {
      console.warn("[FCM] No service worker registration; skipping token");
      return null;
    }

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    console.log("[FCM] FCM token:", token);

    // Attach foreground listener once per page
    if (!foregroundListenerAttached) {
      onMessage(messaging, (payload) => {
        console.log("[FCM] Foreground message:", payload);
        const { title, body } = payload.notification || {};

        if (Notification.permission === "granted" && title) {
          new Notification(title, {
            body: body || "",
            icon: "/Logo2.png",
          });
        }
      });

      foregroundListenerAttached = true;
    }

    return token;
  } catch (err) {
    console.error("[FCM] token error:", err);
    return null;
  }
}
