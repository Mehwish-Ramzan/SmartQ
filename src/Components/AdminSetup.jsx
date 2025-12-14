// AdminSetup.jsx
// First-time admin creation screen (UI + call to backend).

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../api";

const handleSubmit = async (e) => {
  e.preventDefault();
  setError(null);
  setIsLoading(true);

  try {
    const res = await fetch(`${API_URL}/api/admin/setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Setup failed");
    }

    // Save JWT + admin in localStorage
    localStorage.setItem("smartq_admin_token", data.token);
    localStorage.setItem("smartq_admin_user", JSON.stringify(data.admin));

    navigate("/admin/dashboard");
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};

const AdminSetup = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleBack = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (username.trim().length < 4) {
      setError("Username must be at least 4 characters.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/admin/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create admin account.");
      }

      setSuccess("Admin account created. Redirecting to login…");
      setTimeout(() => {
        navigate("/admin/login");
      }, 1200);
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-16 pb-10 md:pt-20 md:pb-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* Top row: Back + SmartQ + spacer */}
        <div className="mb-10 flex items-center justify-between border-b border-slate-200 pb-4">
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

          <span className="w-10" />
        </div>

        {/* Centered card */}
        <div className="flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white px-8 py-10 shadow-xl shadow-slate-200">
            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50">
              <svg
                className="h-8 w-8 text-indigo-500"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M12 3L6 5V11C6 15.4183 8.68629 19.5 12 21C15.3137 19.5 18 15.4183 18 11V5L12 3Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12 9V13"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="7" r="0.75" fill="currentColor" />
              </svg>
            </div>

            <h1 className="mt-5 text-center text-xl font-semibold text-slate-900">
              Admin Setup
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              Create your admin credentials to secure the admin panel.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="admin-username"
                  className="text-sm font-medium text-slate-800"
                >
                  Admin Username
                </label>
                <input
                  id="admin-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username (min 4 characters)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="admin-password"
                  className="text-sm font-medium text-slate-800"
                >
                  Password
                </label>
                <input
                  id="admin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (min 6 characters)"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="admin-password-confirm"
                  className="text-sm font-medium text-slate-800"
                >
                  Confirm Password
                </label>
                <input
                  id="admin-password-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                />
              </div>

              {/* Security note card */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-slate-700">
                <p className="flex items-center gap-2 font-semibold text-amber-800">
                  <span>⚠️</span>
                  <span>Important Security Notes:</span>
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Remember these credentials – they cannot be recovered.
                  </li>
                  <li>They will be stored securely in the database.</li>
                  <li>For production, use HTTPS and strong passwords.</li>
                  <li>Clearing the database will remove the admin account.</li>
                </ul>
              </div>

              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}
              {success && (
                <p className="text-sm font-medium text-emerald-600">
                  {success}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Creating..." : "Create Admin Account"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                Your credentials are encrypted and stored securely on the
                server.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminSetup;
