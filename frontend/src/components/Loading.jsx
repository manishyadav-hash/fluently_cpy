import React from "react";

function Loading({ label = "Loading" }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[#e7ddff] bg-white/88 px-4 py-3 text-sm text-[#5c4c72] shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e7ddff] border-t-[#7c5cff]" />
      <span>{label}...</span>
    </div>
  );
}

export default Loading;
