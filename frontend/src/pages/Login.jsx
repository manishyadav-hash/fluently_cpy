import React from "react";

function Login() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#8d73ff_0%,#27153e_55%,#160d25_100%)] px-6">
      <div className="w-full max-w-md rounded-3xl border border-white/30 bg-white/92 p-8 shadow-[0_30px_90px_rgba(16,8,34,0.30)]">
        <div className="flex items-center gap-3">
          <img src="/fluently-logo.svg" alt="Fluently logo" width="41" height="40" className="h-10 w-[41px] shrink-0 object-contain" />
          <h1 className="text-xl font-bold text-black">Fluently</h1>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-[#2a1840]">Admin access</h1>
        <p className="mt-2 text-sm text-[#b9a7d5]">Sign in to manage learning content and analytics.</p>

        <form className="mt-6 flex flex-col gap-4">
          <label className="text-sm font-medium text-[#b9a7d5]">
            Email
            <input
              className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840]"
              placeholder="admin@fluently.ai"
              type="email"
            />
          </label>
          <label className="text-sm font-medium text-[#b9a7d5]">
            Password
            <input
              className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840]"
              placeholder="••••••••"
              type="password"
            />
          </label>
          <button className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)]">
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}

export default Login;
