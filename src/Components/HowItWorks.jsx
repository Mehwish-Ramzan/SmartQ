// HowItWorks.jsx
// Three-step explanation section from your Figma.
// This supports your SRS description of overall flow: register → wait → get served.

import React from "react";

const steps = [
  {
    id: "1",
    title: "Get Your Token",
    description:
      "Scan the QR code or tap the button to register. Provide your name and optional phone number.",
  },
  {
    id: "2",
    title: "Wait Comfortably",
    description:
      "Track your position in real time and receive alerts when your turn is getting close.",
  },
  {
    id: "3",
    title: "Get Served",
    description:
      "You’ll be called when it’s your turn—no need to stand in line or crowd the counter.",
  },
];

const HowItWorks = () => {
  return (
    <section className="border-t border-slate-200 bg-white py-10 md:py-12">
      <div className="mx-auto max-w-6xl px-4">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900">
          How It Works
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.id}
              className="flex flex-col items-center text-center md:items-start md:text-left"
            >
              <div className="mb-3 flex items-center justify-center">
                <div className="flex h-13 w-13 items-center justify-center rounded-full bg-indigo-200 p-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-black bg-indigo-600 text-sm font-semibold text-white">
                    {step.id}
                  </span>
                </div>
              </div>
              <h3 className="text-base font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
