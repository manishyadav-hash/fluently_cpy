import React from "react";
import { BrowserRouter, Routes, Route, Outlet, NavLink } from "react-router-dom";
import Sidebar from "./components/Sidebar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Courses from "./pages/Courses.jsx";
import CourseDetail from "./pages/CourseDetail.jsx";
import Modules from "./pages/Modules.jsx";
import Lessons from "./pages/Lessons.jsx";
import LessonDetail from "./pages/LessonDetail.jsx";
import Questions from "./pages/Questions.jsx";
import Subscription from "./pages/Subscription.jsx";
import Login from "./pages/Login.jsx";
import NotFound from "./pages/NotFound.jsx";

const NAV_ITEMS = [
  { label: "Dashboard", path: "/" },
  { label: "Courses", path: "/courses" },
  { label: "Modules", path: "/modules" },
  { label: "Lessons", path: "/lessons" },
  { label: "Questions", path: "/questions" },
  { label: "Subscription", path: "/subscription" }
];

function AppShell() {
  return (
    <div className="min-h-screen bg-[#fbf7ff]">
      <div className="md:hidden sticky top-0 z-40 overflow-hidden border-b border-[#e7ddff] bg-[#fbf7ff]/95 backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-3">
          <img
            src="/fluently-logo.svg"
            alt="Fluently logo"
            width="32"
            height="31"
            className="h-8 w-8 shrink-0 object-contain"
          />
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-black font-bold">Fluently</p>
          </div>
        </div>
        <div className="w-full overflow-hidden px-4 py-1">
          <div className="w-full max-w-full overflow-x-auto overflow-y-hidden">
            <nav className="flex w-max gap-2">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#7c5cff] text-white shadow-[0_10px_24px_rgba(124,92,255,0.24)]"
                      : "border border-[#e7ddff] bg-white/88 text-[#67577f]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="flex">
        <Sidebar />
        <main className="min-h-screen flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:gap-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} />
          <Route path="/courses/:courseId" element={<CourseDetail />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/lessons" element={<Lessons />} />
          <Route path="/lessons/:lessonId" element={<LessonDetail />} />
          <Route path="/questions" element={<Questions />} />
          <Route path="/subscription" element={<Subscription />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
