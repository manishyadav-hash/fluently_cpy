import React from "react";

function NotFound() {
  return (
    <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-6 text-[#5c4c72] shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
      <h2 className="text-xl font-semibold text-[#2a1840]">Page not found</h2>
      <p className="mt-2 text-sm">The page you are looking for does not exist.</p>
    </div>
  );
}

export default NotFound;
