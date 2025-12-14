// JoinQueue.jsx
// Sprint 2: Full name step. Now routes to phone step on Next.

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";


const JoinQueue = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");

  const isValid = fullName.trim().length > 0;

  const handleBack = () => {
    // Back always returns to landing page
    navigate("/");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!isValid) return;

    // Go to Sprint 3 (phone number step) and carry name forward for later use
    navigate("/join/phone", { state: { fullName: fullName.trim() } });
  };

  return (
    <section className="py-10 md:py-14">
      <div className="mx-auto max-w-6xl px-4">
        {/* Top row: Back + SmartQ title */}
        <div className="mb-10 flex items-center justify-between">
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
        <div className="flex justify-center">
          <div className="w-full max-w-md rounded-3xl bg-white px-8 py-10 shadow-xl shadow-slate-200">
            <h1 className="text-xl font-semibold text-slate-900">
              Join the Queue
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Please enter your name to get started.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-6">
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium text-slate-800"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-indigo-200 placeholder:text-slate-400"
                />
              </div>

              <button
                type="submit"
                disabled={!isValid}
                className={`mt-2 w-full rounded-2xl py-2.5 text-sm font-semibold text-white shadow-md transition ${
                  isValid
                    ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-400/40"
                    : "bg-indigo-300 cursor-not-allowed shadow-none"
                }`}
              >
                Next
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinQueue;
