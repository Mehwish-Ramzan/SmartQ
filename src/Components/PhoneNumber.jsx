// src/Components/PhoneNumber.jsx
// using react-international-phone, but NOW actually joining the queue

import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PhoneInput } from "react-international-phone";
import "react-international-phone/style.css";
import { requestFcmToken } from "../utils/fcmClient";
import { API_BASE_URL } from "../config";

const PhoneNumber = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Full name from previous step
  const fullName = location.state?.fullName || "";

  // ---- CORE FUNCTION: CREATE TICKET + SAVE ID ----
  const joinQueue = async ({ skipPhone = false } = {}) => {
    const payload = {
      fullName: fullName?.trim() || "Guest",
      phone: skipPhone ? "" : phone.trim(),
    };

    console.log(
      skipPhone ? "Skip with name only:" : "Skip & Continue with data:",
      payload
    );

    try {
      setLoading(true);
      setError("");

      // Try to get FCM device token (optional)
      try {
        const deviceToken = await requestFcmToken();
        if (deviceToken) {
          payload.deviceToken = deviceToken;
        }
      } catch (tokenErr) {
        console.warn("Failed to get FCM token:", tokenErr);
      }

      const res = await fetch(`${API_BASE_URL}/api/queue/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || "Failed to join queue");
      }

      // support different response shapes
      const ticket = data.ticket || data.data || data;

      if (ticket && ticket._id) {
        // THIS is what QueueStatus reads
        localStorage.setItem("smartq_last_ticket_id", ticket._id);

        if (ticket.tokenNumber != null) {
          localStorage.setItem(
            "smartq_last_token_number",
            String(ticket.tokenNumber)
          );
        }
      } else {
        console.warn("Join response has no ticket._id:", data);
      }

      // go to personal status page
      navigate("/queue");
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while joining the queue.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate("/"); // or "/join" if that’s your first step
  };

  const handleSkip = () => {
    // name only, no phone
    joinQueue({ skipPhone: true });
  };

  const handleSkipAndContinue = () => {
    // name + phone
    joinQueue({ skipPhone: false });
  };

  return (
    <section className="py-3 md:py-7">
      <div className="mx-auto max-w-6xl px-4">
        {/* Top row: Back + SmartQ title */}
        <div className="mb-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11.75 5L7 9.75L11.75 14.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back</span>
          </button>

          <h2 className="flex-1 text-center text-sm font-semibold text-slate-800">
            SmartQ
          </h2>

          <span className="w-16" />
        </div>

        {/* Centered card */}
        <div className="flex justify-center pt-2">
          <div className="w-full max-w-md rounded-3xl bg-white px-8 py-10 shadow-xl shadow-slate-200">
            <h1 className="text-xl font-semibold text-slate-900">
              Phone Number (Optional)
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Get notified via SMS when your turn is coming up.
            </p>

            <div className="mt-6 space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium text-slate-800"
                >
                  Phone Number
                </label>

                <div
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-sm 
                  focus-within:border-slate-300 focus-within:bg-white focus-within:ring-2 
                  focus-within:ring-indigo-200 transition"
                >
                  <PhoneInput
                    id="phone"
                    defaultCountry="pk"
                    value={phone}
                    onChange={setPhone}
                    inputClassName="!bg-transparent !text-sm !w-full !border-0 !outline-none"
                    countrySelectorStyleProps={{
                      buttonClassName:
                        "!bg-transparent !border-0 !outline-none",
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}

              {/* Buttons row */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleSkip}
                  disabled={loading}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed"
                >
                  Skip
                </button>

                <button
                  type="button"
                  onClick={handleSkipAndContinue}
                  disabled={loading}
                  className="w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-700 hover:shadow-lg disabled:cursor-not-allowed"
                >
                  {loading ? "Joining..." : "Skip & Continue"}
                </button>
              </div>

              <div className="mt-2 flex items-start gap-2 text-xs text-slate-500">
                <span className="mt-[2px]">💡</span>
                <p>
                  Tip: If your browser asks for notification permission, allow
                  it to receive real-time updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PhoneNumber;
