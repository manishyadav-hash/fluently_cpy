import React from "react";

function Navbar({ title, actionLabel = "", onAction, action2Label = "", onAction2 }) {
  return (
    <header className="flex flex-col gap-3 rounded-2xl border border-[#e7ddff] bg-white/88 px-4 py-4 shadow-[0_18px_50px_rgba(124,92,255,0.07)] backdrop-blur sm:px-6 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5] sm:text-xs sm:tracking-[0.35em]">Console</p>
        <h2 className="text-xl font-semibold text-[#2a1840] sm:text-2xl">{title}</h2>
      </div>

      {(actionLabel || action2Label) && (
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center md:justify-end md:gap-3">
          {action2Label && (
            <button
              onClick={onAction2}
              className="w-full rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:border-[#7c5cff] hover:text-[#2a1840] hover:shadow-[0_10px_24px_rgba(124,92,255,0.12)] sm:w-auto"
            >
              {action2Label}
            </button>
          )}

          {actionLabel && (
            <button
              onClick={onAction}
              className="w-full rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:border-[#7c5cff] hover:text-[#2a1840] hover:shadow-[0_10px_24px_rgba(124,92,255,0.12)] sm:w-auto"
            >
              {actionLabel}
            </button>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
