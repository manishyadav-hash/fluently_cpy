import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import ModuleModal from "../components/ModuleModal.jsx";
import Loading from "../components/Loading.jsx";
import { createModule, deleteModule, getModules, updateModule } from "../lib/api.js";

function buildLessonThumbnail(lesson) {
  if (lesson.thumbnail) return lesson.thumbnail;

  const seed = encodeURIComponent(`${lesson.title}-${lesson.id}`);
  return `https://api.dicebear.com/9.x/shapes/svg?seed=${seed}&backgroundColor=f0e8ff,e7ddff,fbf7ff`;
}

function formatLessonMeta(lesson) {
  const bits = [];
  if (lesson.duration) bits.push(lesson.duration);
  const typeLabel = lesson.lessonType ? lesson.lessonType.replaceAll("_", " ") : "mixed";
  bits.push(typeLabel);
  return bits.join(" · ");
}

function Modules() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [editingModule, setEditingModule] = useState(null);

  const refreshModules = async () => {
    const response = await getModules();
    setModules(response.data || []);
  };

  useEffect(() => {
    let isActive = true;

    const loadModules = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getModules();
        if (!isActive) return;
        setModules(response.data || []);
      } catch (requestError) {
        if (!isActive) return;
        setError(requestError.message || "Failed to load modules");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadModules();

    return () => {
      isActive = false;
    };
  }, []);

  const handleSaveModule = async (payload) => {
    try {
      setIsSaving(true);
      setSubmitError("");

      if (editingModule) {
        await updateModule(editingModule.id, payload);
      } else {
        await createModule(payload);
      }

      await refreshModules();
      setIsModalOpen(false);
      setEditingModule(null);
    } catch (requestError) {
      setSubmitError(requestError.message || "Failed to save module");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditModule = (module) => {
    setSubmitError("");
    setEditingModule(module);
    setIsModalOpen(true);
  };

  const handleDeleteModule = async (module) => {
    const confirmed = window.confirm(`Delete module "${module.title}"?`);
    if (!confirmed) return;

    try {
      setError("");
      await deleteModule(module.id);
      await refreshModules();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete module");
    }
  };

  const totalLessons = modules.reduce((count, module) => count + (module.lessons?.length || 0), 0);
  const nextWeek = modules.length > 0 ? Math.max(...modules.map((module) => Number(module.weekNo) || 0)) + 1 : 1;

  return (
    <section className="flex flex-col gap-6">
      <Navbar
        title="Modules"
        actionLabel="Add module"
        onAction={() => {
          setSubmitError("");
          setEditingModule(null);
          setIsModalOpen(true);
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="overflow-hidden rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)] backdrop-blur">
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#7c5cff] to-[#ff9f68]" />
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Total modules</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{modules.length}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)] backdrop-blur">
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#7c5cff] to-[#88d7ff]" />
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Total lessons</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{totalLessons}</p>
        </div>
        <div className="overflow-hidden rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)] backdrop-blur">
          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-[#7c5cff] to-[#c3a6ff]" />
          <p className="mt-4 text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Next week</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{nextWeek}</p>
        </div>
      </div>

      {isLoading ? (
        <Loading label="Loading modules" />
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#e7ddff] bg-[#fbf7ff] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-[#5c4c72]">No modules yet</p>
          <p className="mt-2 text-sm text-[#7d6b96]">Create a module to start building lessons.</p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <div
              key={module.id}
              className="group flex h-[640px] min-h-[640px] flex-col overflow-hidden rounded-[1.75rem] border border-[#e7ddff] bg-white/92 p-4 shadow-[0_18px_50px_rgba(124,92,255,0.06)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(124,92,255,0.1)]"
            >
              <div className="flex h-full min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.34em] text-[#b9a7d5]">Week {module.weekNo}</p>
                    <h3 className="mt-2 truncate text-[1.1rem] font-semibold text-[#2a1840]">{module.title}</h3>
                    <p className="mt-2 min-h-[42px] line-clamp-2 text-sm leading-6 text-[#6e5f83]">
                      {module.description || "No description added yet."}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold text-[#67577f]">
                    {module.lessons?.length || 0} lessons
                  </div>
                </div>

                <div className="mt-4 flex shrink-0 items-center justify-between gap-3 text-xs text-[#b9a7d5]">
                  <p className="uppercase tracking-[0.28em]">Created {new Date(module.createdAt).toLocaleDateString()}</p>
                  <span className="rounded-full border border-[#e7ddff] bg-[#fbf7ff] px-3 py-1 font-medium text-[#8c79ac]">
                    Week {module.weekNo}
                  </span>
                </div>

                <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.35rem] border border-[#e7ddff] bg-gradient-to-b from-[#fcfaff] to-white p-3.5">
                  <div className="flex shrink-0 items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b9a7d5]">Lessons</p>
                    {module.lessons?.length ? (
                      <p className="text-xs text-[#9d8cb9]">{module.lessons.length} total</p>
                    ) : null}
                  </div>

                  {module.lessons?.length ? (
                    <ul className="mt-2 flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto pr-1 scrollbar-hidden">
                      {module.lessons.map((lesson) => (
                        <li
                          key={lesson.id}
                          onClick={() => navigate(`/lessons/${lesson.id}`)}
                          className="group flex cursor-pointer items-center gap-3 rounded-2xl border border-[#f0e8ff] bg-white px-3 py-2.5 transition duration-200 hover:-translate-y-0.5 hover:border-[#d8c7ff] hover:shadow-[0_12px_28px_rgba(124,92,255,0.08)]"
                        >
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[#efe8ff] ring-1 ring-[#f3ecff]">
                            <img
                              src={buildLessonThumbnail(lesson)}
                              alt={lesson.title}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.src =
                                  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=200&q=80";
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-tr from-[#27153e]/18 via-transparent to-transparent" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[#7c5cff] shadow-sm transition group-hover:scale-105">
                                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-[#2a1840]">
                                  {lesson.lessonOrder}. {lesson.title}
                                </p>
                                <p className="mt-1 text-xs text-[#8d7ca7]">{formatLessonMeta(lesson)}</p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <span className="rounded-full bg-[#f0e8ff] px-2.5 py-1 text-[11px] font-semibold capitalize text-[#7c5cff]">
                                  {lesson.lessonType || "mixed"}
                                </span>
                                <span className="text-[11px] font-medium text-[#b9a7d5] transition group-hover:text-[#7c5cff]">Open</span>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="mt-3 rounded-2xl border border-dashed border-[#e7ddff] bg-[#fbf7ff] px-4 py-6 text-center">
                      <p className="text-sm font-medium text-[#5c4c72]">No lessons added yet</p>
                      <p className="mt-1 text-xs text-[#8d7ca7]">Add the first lesson to start this module.</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex shrink-0 flex-wrap gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleEditModule(module)}
                    className="rounded-xl border border-[#e7ddff] px-3 py-2 text-sm font-medium text-[#67577f] transition hover:border-[#cdb7ff] hover:bg-[#f7f2ff]"
                  >
                    Edit module
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteModule(module)}
                    className="rounded-xl border border-[#f2cfe4] px-3 py-2 text-sm font-medium text-[#c2568c] transition hover:border-[#f0b5d0] hover:bg-[#fff5f9]"
                  >
                    Delete module
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModuleModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingModule(null);
        }}
        onSubmit={handleSaveModule}
        isSaving={isSaving}
        error={submitError}
        moduleToEdit={editingModule}
      />
    </section>
  );
}

export default Modules;
