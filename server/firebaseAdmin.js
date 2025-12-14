// server/firebaseAdmin.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let messaging = null;

try {
  const serviceAccountPath = path.join(
    __dirname,
    "firebase-service-account.json"
  );

  if (!fs.existsSync(serviceAccountPath)) {
    console.warn(
      "[FCM] firebase-service-account.json not found – FCM disabled."
    );
  } else {
    const serviceAccount = JSON.parse(
      fs.readFileSync(serviceAccountPath, "utf8")
    );

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("[FCM] Firebase Admin initialized");
    }

    messaging = admin.messaging();
  }
} catch (err) {
  console.error("[FCM] Firebase Admin init error:", err);
}

export { messaging };
