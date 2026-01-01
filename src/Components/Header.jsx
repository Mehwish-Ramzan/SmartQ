// src/Components/Header.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";

const Header = () => {
  const navigate = useNavigate();
  const [tokenNumber, setTokenNumber] = useState(null);

  useEffect(() => {
    const n = localStorage.getItem("smartq_last_token_number");
    setTokenNumber(n ? String(n) : null);

    const onStorage = () => {
      const updated = localStorage.getItem("smartq_last_token_number");
      setTokenNumber(updated ? String(updated) : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl">
            <img src={Logo} alt="SmartQ Logo" className="h-10 w-10 object-cover" />
          </div>
          <span
            onClick={() => navigate("/")}
            className="cursor-pointer text-xl font-semibold tracking-tight"
          >
            SmartQ
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-3 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => navigate("/display")}
            className="rounded-full px-2 py-1 transition hover:text-slate-900 hover:underline"
          >
            Display
          </button>

          <button
            type="button"
            onClick={() => navigate("/my-token")}
            className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:text-slate-900 hover:underline"
          >
            <span>View Token</span>
            {tokenNumber && (
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700">
                #{tokenNumber}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin/login")}
            className="rounded-full px-2 py-1 transition hover:text-slate-900 hover:underline"
          >
            Admin
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
