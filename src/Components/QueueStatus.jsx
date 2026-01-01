// src/Components/QueueStatus.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";
import { API_BASE_URL } from "../config";

const QueueStatus = () => {
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const ticketId = localStorage.getItem("smartq_last_ticket_id");

  const fetchStatus = useCallback(async () => {
    if (!ticketId) return;

    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/queue/status/${ticketId}`);
      if (!res.ok) {
        throw new Error("Could not load queue status");
      }
      const data = await res.json();
      setTicket(data.ticket);
      setPosition(data.position);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load queue status");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) {
      setLoading(false);
      return;
    }
    fetchStatus();

    // polling fallback
    const id = setInterval(fetchStatus, 6000);
    return () => clearInterval(id);
  }, [ticketId, fetchStatus]);

  // socket: refresh when queue changes
  useEffect(() => {
    if (!ticketId) return;

    const handleRefresh = () => {
      fetchStatus();
    };

    socket.on("ticket:joined", handleRefresh);
    socket.on("ticket:called", handleRefresh);

    return () => {
      socket.off("ticket:joined", handleRefresh);
      socket.off("ticket:called", handleRefresh);
    };
  }, [ticketId, fetchStatus]);

  const handleBackHome = () => {
    navigate("/");
  };

  if (!ticketId) {
    return (
      <section className="pt-20 pb-10">
        <div className="mx-auto max-w-md px-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            No active token
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            You haven&apos;t joined the queue yet. Get your token to see live
            status.
          </p>
          <button
            type="button"
            onClick={handleBackHome}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-20 pb-10">
      <div className="mx-auto max-w-md px-4">
        <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
          Your Queue Status
        </h2>

        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          {loading && (
            <p className="text-center text-sm text-slate-500">
              Loading your token…
            </p>
          )}

          {!loading && error && (
            <p className="text-center text-sm text-red-600">{error}</p>
          )}

          {!loading && ticket && !error && (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Token Number
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                #{ticket.tokenNumber}
              </p>

              <p className="mt-3 text-sm text-slate-600">
                Name:{" "}
                <span className="font-semibold text-slate-900">
                  {ticket.fullName}
                </span>
              </p>
              {/* Service */}
              {(ticket.serviceLabel || ticket.serviceKey) && (
                <p className="mt-3 text-sm text-slate-600">
                  Service:{" "}
                  <span className="font-semibold text-slate-900">
                    {ticket.serviceLabel || ticket.serviceKey}
                  </span>
                  {ticket.serviceNote ? (
                    <span className="text-slate-500">
                      {" "}
                      — {ticket.serviceNote}
                    </span>
                  ) : null}
                </p>
              )}

              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => navigate("/my-token")}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  Manage Token
                </button>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Status:{" "}
                  <span className="ml-1">
                    {ticket.status.charAt(0).toUpperCase() +
                      ticket.status.slice(1)}
                  </span>
                </span>

                {ticket.counterName && (
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    Counter: {ticket.counterName}
                  </span>
                )}
              </div>

              {ticket.status === "waiting" && (
                <p className="mt-4 text-sm text-slate-700">
                  There {position === 1 ? "is" : "are"}{" "}
                  <span className="font-semibold">
                    {position != null ? position - 1 : "…"}
                  </span>{" "}
                  people ahead of you. Your position is{" "}
                  <span className="font-semibold">
                    {position != null ? position : "…"}
                  </span>
                  .
                </p>
              )}

              {ticket.status === "called" && (
                <p className="mt-4 text-sm font-medium text-emerald-700">
                  It&apos;s your turn! Please proceed to{" "}
                  <span className="font-semibold">
                    {ticket.counterName || "the counter"}
                  </span>
                  .
                </p>
              )}

              {ticket.status === "served" && (
                <p className="mt-4 text-sm text-slate-700">
                  Your ticket has been{" "}
                  <span className="font-semibold">served</span>. Thank you for
                  using SmartQ.
                </p>
              )}

              {ticket.status === "skipped" && (
                <p className="mt-4 text-sm text-rose-600">
                  Your token was skipped. Please contact staff if this is a
                  mistake.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default QueueStatus;
