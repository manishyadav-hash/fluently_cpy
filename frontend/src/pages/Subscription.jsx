import React from "react";
import Navbar from "../components/Navbar.jsx";

const PLANS = [
  { name: "Starter", price: "₹9", detail: "Daily AI practice, streaks" },
  { name: "Pro", price: "₹19", detail: "Full course library, voice coach" },
  { name: "Teams", price: "₹49", detail: "Admin seats, analytics" }
];

function Subscription() {
  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Subscription" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {PLANS.map((plan) => (
          <div key={plan.name} className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
            <p className="text-xs uppercase tracking-[0.25em] text-[#b9a7d5]">{plan.name}</p>
            <h3 className="mt-3 text-3xl font-semibold text-[#2a1840]">{plan.price}</h3>
            <p className="mt-2 text-sm text-[#6e5f83]">{plan.detail}</p>
            <button className="mt-4 rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)]">
              Configure plan
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export default Subscription;
