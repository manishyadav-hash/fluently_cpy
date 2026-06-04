import React from "react";

function StatCard({ title, value, caption, accent }) {
  return (
    <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
      <p className="text-xs uppercase tracking-[0.25em] text-[#b9a7d5]">{title}</p>
      <div className="mt-4 flex items-end gap-3">
        <p className={`text-3xl font-semibold ${accent || "text-[#2a1840]"}`}>{value}</p>
        <span className="text-sm text-[#7d6b96]">{caption}</span>
      </div>
    </div>
  );
}

export default StatCard;
