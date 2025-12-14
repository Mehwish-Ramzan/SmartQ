// Header.jsx
// Navigation bar with SmartQ branding and Display/Admin links.
// Later you can connect these buttons to routes (/display, /admin).
import { useNavigate } from "react-router-dom";
import Logo from "../assets/Logo.png";


const Header = () => {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand section */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xltext-xs font-bold text-indigo-600">
            <img src={Logo} alt="SmartQ Logo" className="h-20 w-20 object-cover" />
          </div>
          <span onClick={() => navigate("/")} className="text-xl font-semibold tracking-tight cursor-pointer">SmartQ</span>
        </div> 

        {/* Simple nav for now (no routing yet) */}
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => navigate("/display")}
            className="rounded-full px-2 py-1 transition hover:text-slate-900 hover:underline"
          >
            Display
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
