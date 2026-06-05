import React from "react";
import Navbar from "../components/Navbar.jsx";
import StatCard from "../components/StatCard.jsx";
import UserTable from "../components/UserTable.jsx";
import LessonTable from "../components/LessonTable.jsx";

function Dashboard() {
  const handleViewAllLearners = () => {
    // Hook up the learners API or route here when it is ready.
  };

  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Dashboard" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Active learners" value="8.2k" caption="+12% this week" />
        <StatCard title="Inactive learners" value="2.2k" caption="-15% this week" accent="text-[#7c5cff]" />
        <StatCard title="Premium users" value="5.2k" caption="+10% this week" accent="text-[#7c5cff]" />
        <StatCard title="Trial to paid" value="22%" caption="Best in 30 days" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <UserTable onViewAll={handleViewAllLearners} />
        <LessonTable />
      </div>
    </section>
  );
}

export default Dashboard;
