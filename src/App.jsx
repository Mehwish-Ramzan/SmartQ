// App.jsx

import React from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Header from "./Components/Header";
import Footer from "./Components/Footer";
import Landing from "./Components/Landing";
import JoinQueue from "./Components/JoinQueue";
import PhoneNumber from "./Components/PhoneNumber";
import QueueStatus from "./Components/QueueStatus";
import Display from "./Components/Display.jsx";
import AdminSetup from "./Components/AdminSetup";
import AdminLogin from "./Components/AdminLogin";
import AdminDashboard from "./Components/AdminDashboard";


const AppLayout = () => {
  const location = useLocation();
  const isDisplayPage = location.pathname === "/display";

  return (
    <div
      className={
        isDisplayPage
          ? "min-h-screen text-slate-900 flex flex-col"
          : "min-h-screen bg-gradient-to-br from-indigo-50 via-white to-slate-50 text-slate-900 flex flex-col"
      }
    >
      {/* Header + Footer everywhere EXCEPT the Display screen */}
      {!isDisplayPage && <Header />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/join" element={<JoinQueue />} />
          <Route path="/join/phone" element={<PhoneNumber />} />
          <Route path="/queue" element={<QueueStatus />} />
          <Route path="/display" element={<Display />} />
          <Route path="/admin/setup" element={<AdminSetup />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
        </Routes>
      </main>

      {!isDisplayPage && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
};

export default App;
