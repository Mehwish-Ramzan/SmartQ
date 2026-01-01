// smart-q/src/utils/fcmClient.js
import { getToken, onMessage } from "firebase/messaging";
import { getMessagingSafe } from "../firebase";

let foregroundListenerAttached = false;

async function ensureSw() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  try {
    // ✅ better: don't pass script path in getRegistration
    let reg = await navigator.serviceWorker.getRegistration();

    if (!reg) {
      reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    }

    const readyReg = await navigator.serviceWorker.ready;
    return readyReg;
  } catch (err) {
    console.error("[FCM] SW registration failed:", err);
    return null;
  }
}

// ✅ NEW: attach listener even if token already exists
export async function attachForegroundListener() {
  try {
    const messaging = await getMessagingSafe();
    if (!messaging) return;

    if (foregroundListenerAttached) return;

    onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);

      const title =
        payload?.notification?.title ||
        payload?.data?.title ||
        "SmartQ";

      const body =
        payload?.notification?.body ||
        payload?.data?.body ||
        "";

      if (Notification.permission === "granted") {
        new Notification(title, {
          body,
          icon: "/Logo2.png",
        });
      }
    });

    foregroundListenerAttached = true;
  } catch (e) {
    console.warn("[FCM] attachForegroundListener failed:", e);
  }
}

export async function requestFcmToken() {
  try {
    if (typeof window === "undefined") return null;
    if (!("Notification" in window)) return null;

    const messaging = await getMessagingSafe();
    if (!messaging) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const swReg = await ensureSw();
    if (!swReg) return null;

    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: swReg,
    });

    console.log("[FCM] FCM token:", token);

    // ✅ make sure listener is attached
    await attachForegroundListener();

    return token;
  } catch (err) {
    console.error("[FCM] token error:", err);
    return null;
  }
}
