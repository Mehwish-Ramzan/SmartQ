// src/Components/MyToken.jsx
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { socket } from "../socket";

const MyToken = () => {
  const navigate = useNavigate();
  const ticketId = localStorage.getItem("smartq_last_ticket_id");

  const [ticket, setTicket] = useState(null);
  const [position, setPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!ticketId) {
      setLoading(false);
      return;
    }

    try {
      setError("");
      const res = await fetch(`${API_BASE_URL}/api/queue/status/${ticketId}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not load token status");

      setTicket(data.ticket);
      setPosition(data.position);
    } catch (e) {
      setError(e.message || "Failed to load token");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 6000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  useEffect(() => {
    const handleRefresh = () => fetchStatus();
    socket.on("ticket:joined", handleRefresh);
    socket.on("ticket:called", handleRefresh);
    socket.on("ticket:deleted", handleRefresh);
    return () => {
      socket.off("ticket:joined", handleRefresh);
      socket.off("ticket:called", handleRefresh);
      socket.off("ticket:deleted", handleRefresh);
    };
  }, [fetchStatus]);

  const clearLocalToken = () => {
    localStorage.removeItem("smartq_last_ticket_id");
    localStorage.removeItem("smartq_last_token_number");
  };

  const handleDelete = async () => {
    if (!ticketId) return;

    try {
      setDeleting(true);
      setError("");

      const res = await fetch(`${API_BASE_URL}/api/queue/ticket/${ticketId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Delete failed");

      clearLocalToken();
      setConfirmOpen(false);
      setDeletedOpen(true);
    } catch (e) {
      setError(e.message || "Could not delete token");
    } finally {
      setDeleting(false);
    }
  };

  if (!ticketId) {
    return (
      <section className="pt-20 pb-10">
        <div className="mx-auto max-w-md px-4 text-center">
          <h1 className="text-xl font-semibold text-slate-900">No active token</h1>
          <p className="mt-2 text-sm text-slate-600">
            You don’t have a saved token right now.
          </p>
          <button
            type="button"
            onClick={() => navigate("/join")}
            className="mt-5 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-indigo-700"
          >
            Get a Token
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-20 pb-10">
      <div className="mx-auto max-w-md px-4">
        <div className="mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            Home
          </button>
        </div>

        <h2 className="mb-6 text-center text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">
          Token Confirmation
        </h2>

        <div className="rounded-3xl bg-white p-6 shadow-lg shadow-slate-200">
          {loading && <p className="text-center text-sm text-slate-500">Loading…</p>}
          {!loading && error && <p className="text-center text-sm text-rose-600">{error}</p>}

          {!loading && ticket && !error && (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                Token Number
              </p>
              <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                #{ticket.tokenNumber}
              </p>

              <p className="mt-3 text-sm text-slate-600">
                Name: <span className="font-semibold text-slate-900">{ticket.fullName}</span>
              </p>

              {(ticket.serviceLabel || ticket.serviceKey) && (
                <p className="mt-2 text-sm text-slate-600">
                  Service:{" "}
                  <span className="font-semibold text-slate-900">
                    {ticket.serviceLabel || ticket.serviceKey}
                  </span>
                  {ticket.serviceNote ? (
                    <span className="text-slate-500"> — {ticket.serviceNote}</span>
                  ) : null}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  Status:{" "}
                  <span className="ml-1">
                    {ticket.status?.charAt(0).toUpperCase() + ticket.status?.slice(1)}
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
                  Position:{" "}
                  <span className="font-semibold">
                    {position != null ? position : "…"}
                  </span>
                </p>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/queue")}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                >
                  View Live Status
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="w-full rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700"
                >
                  Delete Token
                </button>
              </div>

              <p className="mt-3 text-[11px] text-slate-400">
                Delete is for cases like “wrong service / wrong entry”. Served tokens may be blocked.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete your token?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove your token from the queue. You’ll need to generate a new one.
            </p>

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="w-full rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted Modal */}
      {deletedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              ✓
            </div>
            <h3 className="mt-3 text-lg font-semibold text-slate-900">Token deleted</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your token has been removed from the database.
            </p>

            <button
              type="button"
              onClick={() => {
                setDeletedOpen(false);
                navigate("/");
              }}
              className="mt-5 w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Back to Home
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default MyToken;
