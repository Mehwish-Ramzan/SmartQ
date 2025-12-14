// Footer.jsx
// Simple footer with © text and placeholder links for Contact and Terms.

import React from "react";

const Footer = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-50 py-4">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 text-xs text-slate-500 sm:flex-row sm:items-center">
        <span>© SmartQ 2025</span>

        <div className="flex gap-4">
          {/* Later you can wire these to contact form / terms page */}
          <button
            type="button"
            className="text-xs text-slate-500 transition hover:text-slate-800"
          >
            Contact
          </button>
          <button
            type="button"
            className="text-xs text-slate-500 transition hover:text-slate-800"
          >
            Terms
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
