// AdminLogin.jsx
// Admin login screen – calls backend /api/admin/login and stores JWT.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

const AdminLogin = () => {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBack = () => {
    navigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password) {
      setError("Enter username and password.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      console.log("Login response:", data);

      if (!res.ok) {
        throw new Error(data.message || "Invalid username or password.");
      }

      // Save JWT for later protected routes
      localStorage.setItem("smartq_admin_token", data.token);

      // TODO: real admin dashboard
      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pt-16 pb-10 md:pt-15 md:pb-14">
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
            <h1 className="text-center text-xl font-semibold text-slate-900">
              Admin Login
            </h1>
            <p className="mt-2 text-center text-sm text-slate-600">
              Sign in with your admin credentials to access the dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="login-username"
                  className="text-sm font-medium text-slate-800"
                >
                  Admin Username
                </label>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-slate-800"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 pr-11 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      // Eye-off icon
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M3 3l18 18"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <path
                          d="M10.5858 10.5858C10.2107 10.9609 10 11.4696 10 12C10 13.1046 10.8954 14 12 14C12.5304 14 13.0391 13.7893 13.4142 13.4142"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M8.458 5.104C9.58 4.71 10.768 4.5 12 4.5C16.5 4.5 20 7.11 21.5 11.5C21.03 12.89 20.33 14.13 19.45 15.18M5.12 5.12C3.58 6.32 2.38 7.99 1.5 11.5C2.51 14.65 4.5 16.84 7 18"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      // Eye icon
                      <svg
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M2 12C3.5 7.5 7.25 4.5 12 4.5C16.75 4.5 20.5 7.5 22 12C20.5 16.5 16.75 19.5 12 19.5C7.25 19.5 3.5 16.5 2 12Z"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <circle
                          cx="12"
                          cy="12"
                          r="3"
                          stroke="currentColor"
                          strokeWidth="1.7"
                        />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-sm font-medium text-red-600">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-2xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-600 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? "Signing in..." : "Login as Admin"}
              </button>

              <p className="mt-3 text-center text-xs text-slate-500">
                This area is restricted to authorized SmartQ administrators.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AdminLogin;
