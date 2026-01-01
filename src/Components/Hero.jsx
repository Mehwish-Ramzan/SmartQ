// Hero.jsx
// Main hero block from Sprint 1.
// Get Your Token now navigates to the Join Queue screen

import { useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";

const Hero = () => {
  const navigate = useNavigate();

  const handleGetTokenClick = () => {
    // FR1 UI entry: open Join Queue form
    navigate("/join");
  };

  const handleViewStatusClick = () => {
    // View queue status uses the same public display screen
    navigate("/display");
  };

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join`
      : "https://example.com/join";

  return (
    <section className="py-12 md:py-16">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 md:flex-row md:items-center md:justify-between">
        {/* LEFT – text */}
        <div className="max-w-xl space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
            SmartQ — Smart Tokenless Queue System
          </p>

          <h1 className="text-4xl font-bold leading-tight tracking-tight text-slate-900 md:text-5xl">
            <span className="block">Skip the line.</span>
            <span className="block text-indigo-600">Join the queue.</span>
          </h1>

          <p className="text-sm md:text-base text-slate-600">
            SmartQ helps you manage your time better. Get a digital token,
            receive real-time updates, and know exactly when it&apos;s your
            turn—without standing in a crowded line.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGetTokenClick}
              className="rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-400/40 transition hover:bg-indigo-700 hover:shadow-lg"
            >
              Get Your Token
            </button>

            <button
              type="button"
              onClick={handleViewStatusClick}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-200"
            >
              View Queue Status
            </button>
          </div>
        </div>

        {/* RIGHT – QR card (same as before) */}
        <div className="w-full max-w-sm md:w-auto">
          <div className="rounded-2xl bg-white p-6 shadow-xl shadow-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              Scan to Join
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              On-site visitors can scan this QR code to open the join screen on
              their phone instantly.
            </p>

            <div className="mt-5 flex justify-center">
              <div className="flex h-40 w-40 items-center justify-center rounded-xl border-[6px] border-slate-900 bg-slate-100">
                <QRCode
                  value={joinUrl}
                  size={144}
                  style={{ height: "144px", width: "144px" }}
                />
              </div>
            </div>

            <p className="mt-3 text-center text-[11px] text-slate-400">
              QR points to: <span className="font-mono">{joinUrl}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
