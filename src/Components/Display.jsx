// src/Components/Display.jsx
import React, { useEffect, useState, useCallback } from "react";
import { socket } from "../socket";
import Logo2 from "../assets/Logo2.png";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

// Simple voice helper for announcements
const speak = (text) => {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) {
    console.warn("Speech synthesis not supported in this browser");
    return;
  }
  if (!text) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US"; // or "ur-PK" if browser supports
  utterance.rate = 1;
  utterance.pitch = 1;

  window.speechSynthesis.speak(utterance);
};

const Display = () => {
  const [counters, setCounters] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  const fetchDisplayFeed = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/queue/display-feed`);
      if (!res.ok) throw new Error("Failed to load display feed");
      const data = await res.json();
      setCounters(data.counters || []);
      setActivity(data.recentActivity || []);
    } catch (err) {
      console.error(err);
      setError(
        "Unable to connect to server right now. Screen will auto-retry."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisplayFeed();

    // polling fallback every 10s
    const id = setInterval(fetchDisplayFeed, 10000);
    return () => clearInterval(id);
  }, [fetchDisplayFeed]);

  useEffect(() => {
    const handleCountersUpdated = (payload) => {
      if (payload?.counters) {
        setCounters(payload.counters);
      }
    };

    const handleTicketCalled = (payload) => {
      if (payload?.activity) {
        setActivity((prev) => [payload.activity, ...prev].slice(0, 10));
      }

      if (payload?.ticket) {
        const t = payload.ticket;
        const counterLabel = t.counterName || t.counter || "the counter";
        const message = `Token number ${t.tokenNumber}, please proceed to ${counterLabel}.`;
        speak(message);
      }

      fetchDisplayFeed();
    };

    const handleTicketRecalled = (payload) => {
      if (payload?.activity) {
        setActivity((prev) => [payload.activity, ...prev].slice(0, 10));
      }

      if (payload?.ticket) {
        const t = payload.ticket;
        const counterLabel = t.counterName || t.counter || "the counter";
        const message = `Reminder. Token number ${t.tokenNumber}, please proceed again to ${counterLabel}.`;
        speak(message);
      }

      fetchDisplayFeed();
    };

    socket.on("counters:updated", handleCountersUpdated);
    socket.on("ticket:called", handleTicketCalled);
    socket.on("ticket:recalled", handleTicketRecalled);
    socket.on("ticket:joined", fetchDisplayFeed);

    return () => {
      socket.off("counters:updated", handleCountersUpdated);
      socket.off("ticket:called", handleTicketCalled);
      socket.off("ticket:recalled", handleTicketRecalled);
      socket.off("ticket:joined", fetchDisplayFeed);

      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [fetchDisplayFeed]);

  // 👉 total waiting, so header me proper text aa jaye
  const totalWaiting = counters.reduce(
    (sum, c) => sum + (typeof c.waitingCount === "number" ? c.waitingCount : 0),
    0
  );

  return (
    <>
      <div className="flex items-center border-b-2 border-slate-500 bg-slate-700 justify-between">
        <div className="relative group inline-block ml-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm font-medium text-white hover:underline transition hover:text-slate-300"
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
        </div>

        <div className="flex items-center gap-1">
          <img
            src={Logo2}
            alt="SmartQ Logo"
            className="h-20 w-20 object-cover"
          />
          <span
            onClick={() => navigate("/")}
            className="text-2xl text-white font-semibold tracking-tight cursor-pointer"
          >
            SmartQ
          </span>
        </div>

        <span className="w-16" />
      </div>

      <section className="min-h-screen bg-slate-900 py-4 text-slate-50">
        <div className="mx-auto max-w-6xl px-4">
          <header className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                SmartQ – Now Serving
              </h1>
              <p className="text-xs text-slate-400">
                This screen updates automatically when tokens are called.
              </p>
            </div>
            <p className="text-xs text-slate-300">
              {loading
                ? ""
                : totalWaiting > 0
                ? `${totalWaiting} customer${
                    totalWaiting > 1 ? "s" : ""
                  } waiting`
                : "No customers waiting"}
            </p>
          </header>

          {loading ? (
            <p className="text-sm text-slate-300">Loading display…</p>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
              {/* Counters grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {counters.map((c) => {
                  const hasActiveToken =
                    c.nowServingToken !== null &&
                    c.nowServingToken !== undefined;

                  return (
                    <div
                      key={c._id || c.name}
                      className="rounded-3xl bg-slate-800 p-5 shadow-lg shadow-black/40"
                    >
                      <p className="text-sm font-medium text-slate-300">
                        {c.name}
                      </p>

                      <p className="mt-2 text-xs text-slate-500">
                        {hasActiveToken
                          ? "Now serving token"
                          : "No token is being served"}
                      </p>

                      <p className="mt-1 text-4xl font-bold tracking-tight text-white">
                        {hasActiveToken ? `#${c.nowServingToken}` : "—"}
                      </p>

                      <p className="mt-3 text-xs text-slate-400">
                        {c.waitingCount != null
                          ? `${c.waitingCount} waiting in queue`
                          : "Waiting count unavailable"}
                      </p>
                    </div>
                  );
                })}

                {!counters.length && (
                  <p className="text-sm text-slate-300">
                    No counters configured yet.
                  </p>
                )}
              </div>

              {/* Activity log */}
              <div className="rounded-3xl bg-slate-800 p-5 shadow-lg shadow-black/40">
                <p className="text-sm font-semibold text-slate-100">
                  Recently Called
                </p>
                <div className="mt-3 space-y-2 text-xs">
                  {activity.map((item) => {
                    const time = item.createdAt
                      ? new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "";
                    return (
                      <div
                        key={item._id}
                        className="flex items-center justify-between rounded-2xl bg-slate-900/50 px-3 py-2"
                      >
                        <span className="text-slate-200">{item.message}</span>
                        <span className="text-[11px] text-slate-500">
                          {time}
                        </span>
                      </div>
                    );
                  })}

                  {!activity.length && (
                    <p className="text-slate-400">
                      No tokens have been called yet.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default Display;
