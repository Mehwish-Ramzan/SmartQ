// src/Components/JoinQueue.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICE_OPTIONS } from "../constants/services";

const JoinQueue = () => {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [serviceKey, setServiceKey] = useState(SERVICE_OPTIONS[0]?.value || "cnic_new");
  const [serviceNote, setServiceNote] = useState("");
  const [error, setError] = useState("");

  const selectedService = useMemo(() => {
    return SERVICE_OPTIONS.find((s) => s.value === serviceKey);
  }, [serviceKey]);

  const handleContinue = () => {
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (serviceKey === "other" && !serviceNote.trim()) {
      setError("Please type your service in the manual field.");
      return;
    }

    navigate("/join/phone", {
      state: {
        fullName: fullName.trim(),
        serviceKey,
        serviceLabel: selectedService?.label || "",
        serviceNote: serviceNote.trim(),
      },
    });
  };

  return (
    <section className="py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto w-full max-w-md rounded-3xl bg-white px-7 py-8 shadow-xl shadow-slate-200">
          <h1 className="text-xl font-semibold text-slate-900">Join Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Select your service so staff can route you faster (NADRA-style flow).
          </p>

          <div className="mt-6 space-y-5">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Full Name</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., Mehwish Khan"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              />
            </div>

            {/* Service dropdown */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Service</label>
              <select
                value={serviceKey}
                onChange={(e) => setServiceKey(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              >
                {SERVICE_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Selected: <span className="font-semibold text-slate-700">{selectedService?.label}</span>
              </p>
            </div>

            {/* Manual input (parallel) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">
                Service details (optional)
              </label>
              <input
                value={serviceNote}
                onChange={(e) => setServiceNote(e.target.value)}
                placeholder='e.g., "Address change" or "Urgent renewal"'
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-slate-300 focus:bg-white focus:ring-2 focus:ring-indigo-200"
              />
              <p className="text-xs text-slate-500">
                If you selected “Other”, this field becomes required.
              </p>
            </div>

            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}

            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-700"
            >
              Continue
            </button>

            <p className="text-xs text-slate-500">
              Next: phone number (optional), then you’ll get your token.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default JoinQueue;
