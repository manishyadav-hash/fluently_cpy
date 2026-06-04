import React from "react";
import { NavLink } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/" },
  { label: "Modules", path: "/modules" },
  { label: "Lessons", path: "/lessons" },
  { label: "Questions", path: "/questions" },
  { label: "Subscription", path: "/subscription" }
];

function Sidebar() {
  return (
    <aside className="hidden h-screen w-64 flex-col gap-6 border-r border-[#e7ddff] bg-white/78 px-4 py-6 backdrop-blur md:flex">
      <div className="flex items-center gap-1">
        <img
          src="/fluently-logo.svg"
          alt="Fluently logo"
          width="41"
          height="40"
          className="h-10 w-[41px] shrink-0 object-contain"
        />
        <h1 className="text-xl font-bold text-black">Fluently</h1>
      </div>
      
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-[#7c5cff] text-white shadow-[0_10px_24px_rgba(124,92,255,0.24)]"
                  : "text-[#67577f] hover:bg-[#f0e8ff]"
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}

export default Sidebar;
