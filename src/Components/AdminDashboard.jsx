// src/Components/AdminDashboard.jsx
// Admin Queue Dashboard – pulls data from /api/admin/* and shows filters, table, counters, activity.

import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const STATUS_TABS = [
  { id: "all", label: "All" },
  { id: "waiting", label: "Waiting" },
  { id: "called", label: "Called" },
  { id: "served", label: "Served" },
  { id: "skipped", label: "Skipped" },
];

const statusBadgeClasses = {
  waiting: "bg-amber-100 text-amber-800",
  called: "bg-blue-100 text-blue-800",
  serving: "bg-emerald-100 text-emerald-800",
  served: "bg-slate-100 text-slate-700",
  skipped: "bg-rose-100 text-rose-800",
};

const TOKEN_KEY = "smartq_admin_token";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");

  const [tickets, setTickets] = useState([]);
  const [counters, setCounters] = useState([]);
  const [activity, setActivity] = useState([]);

  const [loading, setLoading] = useState(true);
  const [callingNext, setCallingNext] = useState(false);
  const [connected, setConnected] = useState(true);

  const [announcementText, setAnnouncementText] = useState("");

  const [callingId, setCallingId] = useState(null);

  const token = localStorage.getItem(TOKEN_KEY);

  const handleUnauthorized = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/admin/login");
  };

  const fetchDashboardData = useCallback(async () => {
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setConnected(true);

      const query = new URLSearchParams({
        status: activeTab,
        q: search.trim(),
      }).toString();

      const [queueRes, countersRes, activityRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/queue?${query}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/counters`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/activity?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (
        queueRes.status === 401 ||
        countersRes.status === 401 ||
        activityRes.status === 401
      ) {
        handleUnauthorized();
        return;
      }

      if (!queueRes.ok || !countersRes.ok || !activityRes.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const queueData = await queueRes.json();
      const countersData = await countersRes.json();
      const activityData = await activityRes.json();

      setTickets(queueData.tickets || []);
      setCounters(countersData.counters || []);
      setActivity(activityData.items || []);
    } catch (err) {
      console.error(err);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, token, navigate]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Simple polling so new tickets show up automatically
  useEffect(() => {
    const id = setInterval(fetchDashboardData, 6000);
    return () => clearInterval(id);
  }, [fetchDashboardData]);

  const handleCallNext = async () => {
    if (callingNext) return;
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setCallingNext(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/queue/call-next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}), // future: pass specific counterId if needed
      });

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (res.status === 404) {
        alert("No waiting tickets right now.");
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        alert(data.message || "No online counters available.");
        return;
      }

      if (!res.ok) {
        throw new Error("Call next failed");
      }

      const data = await res.json();
      console.log("Called next ticket:", data);

      // 👇 yahan voice announcement:
      if (data.ticket) {
        const t = data.ticket;
        const counterLabel = t.counterName || t.counter || "the counter";
        const message = `Token number ${t.tokenNumber}, please proceed to ${counterLabel}.`;
        speak(message);
      }
      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert("Could not call next ticket. Check console for details.");
    } finally {
      setCallingNext(false);
    }
  };

  const handleCallTicket = async (ticketId) => {
    if (!ticketId) return;
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      setCallingId(ticketId);

      const res = await fetch(
        `${API_BASE_URL}/api/admin/queue/${ticketId}/call-next`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error(data.message || "Call failed");
      }

      if (data.ticket) {
        const t = data.ticket;
        const counterLabel = t.counterName || t.counter || "the counter";
        speak(
          `Token number ${t.tokenNumber}, please proceed to ${counterLabel}.`
        );
      }

      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not call ticket");
    } finally {
      setCallingId(null);
    }
  };

  // --- helper for Serve / Skip / Recall actions ---
  const performTicketAction = async (ticketId, action) => {
    if (!token) {
      handleUnauthorized();
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/admin/queue/${ticketId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || `Failed to ${action} ticket`);
      }

      await fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert(err.message || `Failed to ${action} ticket`);
    }
  };

  const handleServe = (ticketId) => {
    performTicketAction(ticketId, "serve");
  };

  const handleSkip = (ticketId) => {
    if (!window.confirm("Skip this ticket?")) return;
    performTicketAction(ticketId, "skip");
  };

  const handleRecall = (ticketId) => {
    // 👉 voice announcement yahan karo – tickets state se info lo
    const t = tickets.find((tk) => tk._id === ticketId);
    if (t) {
      const counterLabel = t.counterName || "the counter";
      const message = `Reminder. Token number ${t.tokenNumber}, please proceed again to ${counterLabel}.`;
      speak(message);
    }

    performTicketAction(ticketId, "recall");
  };

  const handleLogout = () => {
    localStorage.removeItem(TOKEN_KEY);
    navigate("/");
  };

  const connectedDotClass = connected ? "bg-emerald-500" : "bg-rose-500";
  const connectedText = connected ? "Connected" : "Offline";

  // Simple helper to speak text (same idea as Display.jsx)
  const speak = (text) => {
    if (typeof window === "undefined") return;
    if (!("speechSynthesis" in window)) {
      console.warn("[Announcements] Speech synthesis not supported");
      return;
    }

    const cleaned = (text || "").trim();
    if (!cleaned) return;

    // previous speech cancel so they don't overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = "en-US"; // "ur-PK" try bhi kar sakti ho agar browser support kare
    utterance.rate = 1;
    utterance.pitch = 1;

    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return (
    <section className="py-6 md:py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* small top label like other pages */}
        {/* <h2 className="mb-4 text-center text-sm font-semibold text-slate-800">
          SmartQ
        </h2> */}

        <div className="flex gap-6">
          {/* LEFT SIDEBAR */}
          <aside className="hidden w-60 flex-shrink-0 rounded-3xl bg-white py-6 shadow-md shadow-slate-200 md:flex md:flex-col">
            <div className="px-6 pb-6">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-100 text-sm font-bold text-indigo-600">
                  Q
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">SmartQ</p>
                  <p className="text-xs text-slate-500">Admin Panel</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 space-y-1 px-2">
              {[
                "Dashboard",
                "Queues",
                "Counters",
                "Announcements",
                "Reports",
                "Settings",
              ].map((item, idx) => {
                const isActive = idx === 0; // only Dashboard active for now
                return (
                  <button
                    key={item}
                    type="button"
                    className={`flex w-full items-center rounded-xl px-4 py-2 text-sm ${
                      isActive
                        ? "bg-indigo-50 font-semibold text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-slate-100 px-6 pt-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                  A
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    Admin User
                  </p>
                  <p className="text-xs text-slate-500">admin@smartq.com</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="mt-4 flex items-center gap-2 text-xs font-semibold text-rose-600 hover:text-rose-700"
              >
                <span>⎋</span>
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* MAIN AREA */}
          <div className="flex-1 space-y-6">
            {/* Top row: title, connection, search, Call Next */}
            <div className="flex flex-col gap-4 rounded-3xl bg-white px-5 py-4 shadow-md shadow-slate-200 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-lg font-semibold text-slate-900">
                  Queue Dashboard
                </h1>
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span
                    className={`inline-flex h-2 w-2 rounded-full ${connectedDotClass}`}
                  />
                  <span>{connectedText}</span>
                </div>
              </div>

              <div className="flex flex-1 flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-end">
                <div className="w-full max-w-xs">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                    <span className="text-slate-400">🔍</span>
                    <input
                      type="text"
                      placeholder="Search by name or token"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full bg-transparent outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCallNext}
                  disabled={callingNext}
                  className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-400"
                >
                  {callingNext ? "Calling..." : "Call Next"}
                </button>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              {/* QUEUE TABLE CARD */}
              <div className="rounded-3xl bg-white p-5 shadow-md shadow-slate-200">
                {/* Tabs + queue dropdown */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
                    {STATUS_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`rounded-full px-3 py-1 ${
                          activeTab === tab.id
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span>Queue:</span>
                    <select className="rounded-lg border border-slate-200 bg-white px-2 py-1">
                      <option>Main</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
                    <thead className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Name</th>
                        <th className="px-3 py-2">Phone</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Counter</th>
                        <th className="px-3 py-2">Time</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-4 text-center text-sm text-slate-500"
                          >
                            Loading queue…
                          </td>
                        </tr>
                      )}

                      {!loading && tickets.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
                            className="px-3 py-4 text-center text-sm text-slate-500"
                          >
                            No tickets in this view.
                          </td>
                        </tr>
                      )}

                      {!loading &&
                        tickets.map((t, idx) => {
                          const statusKey = (t.status || "").toLowerCase();
                          const badgeClass =
                            statusBadgeClasses[statusKey] ||
                            "bg-slate-100 text-slate-700";
                          const joinedTime = t.joinedAt
                            ? new Date(t.joinedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "-";

                          const isCallableStatus = t.status === "called";
                          const isSkippedStatus = t.status === "skipped";
                          const isWaitingStatus = t.status === "waiting";
                          
                          return (
                            <tr
                              key={t._id || t.tokenNumber || idx}
                              className="rounded-2xl bg-slate-50"
                            >
                              {/* # column */}
                              <td className="px-3 py-2 text-xs text-slate-500">
                                {idx + 1}
                              </td>

                              {/* Name */}
                              <td className="px-3 py-2 text-sm font-medium text-slate-900">
                                {t.fullName || "—"}
                              </td>

                              {/* Phone */}
                              <td className="px-3 py-2 text-sm text-slate-700">
                                {t.phone || "—"}
                              </td>

                              {/* Status badge */}
                              <td className="px-3 py-2">
                                <span
                                  className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}
                                >
                                  {(t.status || "").charAt(0).toUpperCase() +
                                    (t.status || "").slice(1)}
                                </span>
                              </td>

                              {/* Counter name */}
                              <td className="px-3 py-2 text-sm text-slate-700">
                                {t.counterName || "—"}
                              </td>

                              {/* Time */}
                              <td className="px-3 py-2 text-xs text-slate-500">
                                {joinedTime}
                              </td>

                              {/* Actions */}
                              <td className="px-3 py-2 text-xs">
                                {isWaitingStatus ? (
                                  <button
                                    type="button"
                                    title="Call this token"
                                    onClick={() => handleCallTicket(t._id)}
                                    disabled={callingId === t._id}
                                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                                  >
                                    <span className="mr-1">📞</span>
                                    {callingId === t._id
                                      ? "Calling..."
                                      : "Call"}
                                  </button>
                                ) : isCallableStatus ? (
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      onClick={() => handleServe(t._id)}
                                      className="rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                                    >
                                      Serve
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSkip(t._id)}
                                      className="rounded-full bg-rose-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-rose-700"
                                    >
                                      Skip
                                    </button>
                                  </div>
                                ) : isSkippedStatus ? (
                                  <button
                                    type="button"
                                    onClick={() => handleRecall(t._id)}
                                    className="rounded-full bg-indigo-600 px-3 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700"
                                  >
                                    Recall
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT COLUMN – Counters + announcements + activity */}
              <div className="space-y-4">
                {/* Counters */}
                <div className="space-y-3 rounded-3xl bg-white p-4 shadow-md shadow-slate-200">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">
                      Counters
                    </p>
                    <span className="text-xs text-slate-500">
                      {counters.length} active
                    </span>
                  </div>

                  <div className="space-y-3">
                    {counters.map((c) => (
                      <div
                        key={c._id || c.name}
                        className="rounded-2xl bg-slate-50 px-4 py-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-base">🖥️</span>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {c.name}
                              </p>
                              <p className="text-xs text-slate-500">
                                Now Serving
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-semibold">
                            {c.online === false ? (
                              <span className="text-rose-500">● Offline</span>
                            ) : (
                              <span className="text-emerald-500">● Online</span>
                            )}
                          </span>
                        </div>

                        <div className="mt-2 text-sm font-semibold text-indigo-600">
                          #{c.nowServingToken || "—"}
                        </div>
                        <div className="mt-1 flex justify-between text-xs text-slate-500">
                          <span>
                            {c.waitingCount != null
                              ? `${c.waitingCount} waiting`
                              : "— waiting"}
                          </span>
                          <span>
                            {c.avgSecondsPerTicket
                              ? `${Math.round(c.avgSecondsPerTicket / 60)} min`
                              : "~4 min"}{" "}
                            per ticket
                          </span>
                        </div>
                      </div>
                    ))}

                    {!counters.length && (
                      <p className="text-xs text-slate-500">
                        No counters defined yet.
                      </p>
                    )}
                  </div>
                </div>

                {/* Announcements (UI only for now) */}
                {/* Announcements */}
                <div className="space-y-3 rounded-3xl bg-white p-4 shadow-md shadow-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Announcements
                  </p>

                  <textarea
                    rows={3}
                    placeholder="Type your announcement here..."
                    value={announcementText} // 👈 linked to state
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => speak(announcementText)} // 👈 local preview
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Play
                    </button>

                    <button
                      type="button"
                      onClick={() => speak(announcementText)} // 👈 for now Broadcast bhi wohi kare
                      className="rounded-full bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Broadcast
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    This will play through this browser&apos;s speakers. Later
                    we can send it to all display screens via sockets.
                  </p>
                </div>

                {/* Recent Activity */}
                <div className="space-y-3 rounded-3xl bg-white p-4 shadow-md shadow-slate-200">
                  <p className="text-sm font-semibold text-slate-900">
                    Recent Activity
                  </p>
                  <div className="space-y-2">
                    {activity.map((item) => {
                      const created = item.createdAt
                        ? new Date(item.createdAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "";

                      return (
                        <div
                          key={item._id}
                          className="flex items-start gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs"
                        >
                          <span className="mt-[2px]">
                            {item.type === "called"
                              ? "🔔"
                              : item.type === "skipped"
                              ? "⏭️"
                              : item.type === "recalled"
                              ? "📢"
                              : "✅"}
                          </span>
                          <div>
                            <p className="text-slate-800">{item.message}</p>
                            {created && (
                              <p className="text-[11px] text-slate-500">
                                {created}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {!activity.length && (
                      <p className="text-xs text-slate-500">
                        No recent activity yet.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* end main area */}
        </div>
      </div>
    </section>
  );
};

export default AdminDashboard;
