import React from "react";

const USERS = [
  { name: "Ayesha Khan", level: "Intermediate", streak: "18 days", status: "Active" },
  { name: "Ravi Patel", level: "Beginner", streak: "6 days", status: "Trial" },
  { name: "Lina Gomez", level: "Advanced", streak: "42 days", status: "Active" },
  { name: "Omar Ali", level: "Intermediate", streak: "12 days", status: "Paused" }
];

function UserTable({ onViewAll }) {
  return (
    <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#2a1840]">Recent Learners</h3>
        <button
          type="button"
          onClick={onViewAll}
          className="text-sm font-medium text-[#7d6b96] transition hover:text-[#2a1840]"
        >
          View all
        </button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">
            <tr>
              <th className="pb-3">Learner</th>
              <th className="pb-3">Level</th>
              <th className="pb-3">Streak</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[#5c4c72]">
            {USERS.map((user) => (
              <tr key={user.name} className="border-t border-[#f0e8ff]">
                <td className="py-3 font-medium text-[#2a1840]">{user.name}</td>
                <td className="py-3">{user.level}</td>
                <td className="py-3">{user.streak}</td>
                <td className="py-3">
                  <span className="rounded-full bg-[#f3f4f6] px-3 py-1 text-xs font-semibold text-[#67577f]">
                    {user.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserTable;
