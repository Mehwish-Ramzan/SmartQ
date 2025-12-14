// server/fcm.js
// Helper functions around Firebase Admin messaging
// Uses firebaseAdmin.js to get the messaging instance.

import { messaging } from "./firebaseAdmin.js";

/**
 * High-level helper: send notification about a ticket.
 *
 * @param {Object} ticket - Mongoose doc ya plain object
 *   { _id, tokenNumber, deviceToken, status, counterName }
 * @param {"called"|"recalled"|"upcoming"|"generic"} eventType
 * @param {string} [counterName]
 * @param {Object} [extraData]
 */
export async function sendTurnNotification(
  ticket,
  eventType = "generic",
  counterName,
  extraData = {}
) {
  if (!messaging) {
    console.warn("[FCM] messaging not initialised; skipping push");
    return;
  }

  if (!ticket || !ticket.deviceToken) {
    console.warn("[FCM] ticket has no deviceToken; skipping push");
    return;
  }

  const counterLabel = counterName || ticket.counterName || "the counter";

  let title = "SmartQ";
  let body = "";

  switch (eventType) {
    case "called":
      title = "Your turn in SmartQ";
      body = `Token #${ticket.tokenNumber} called to ${counterLabel}.`;
      break;

    case "recalled":
      title = "Reminder from SmartQ";
      body = `Reminder: Token #${ticket.tokenNumber} at ${counterLabel}.`;
      break;

    case "upcoming":
      title = "You’re almost at the front";
      body = `Token #${ticket.tokenNumber} will be called soon. Please be ready near ${counterLabel}.`;
      break;

    default:
      body = `Update for token #${ticket.tokenNumber}.`;
      break;
  }

  const data = {
    ticketId: String(ticket._id || ""),
    tokenNumber: String(ticket.tokenNumber || ""),
    counterName: counterLabel,
    status: ticket.status || "",
    eventType,
    ...extraData,
  };

  try {
    await messaging.send({
      token: ticket.deviceToken,
      notification: { title, body },
      data,
    });
    console.log(
      `[FCM] Sent ${eventType} notification to token #${ticket.tokenNumber}`
    );
  } catch (err) {
    console.error("[FCM] Error sending notification:", err?.message || err);
  }
}

/**
 * Low-level helper: send arbitrary push by raw token.
 *
 * @param {string} token
 * @param {{title?: string, body?: string, data?: Object}} options
 */
export async function sendRawNotification(
  token,
  { title, body, data = {} } = {}
) {
  if (!messaging) {
    console.warn("[FCM] messaging not initialised; skipping raw push");
    return;
  }

  if (!token) {
    console.warn("[FCM] No token provided");
    return;
  }

  try {
    await messaging.send({
      token,
      notification: {
        title: title || "SmartQ",
        body: body || "",
      },
      data,
    });
    console.log("[FCM] Sent raw notification");
  } catch (err) {
    console.error("[FCM] Error sending raw notification:", err?.message || err);
  }
}
