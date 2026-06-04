import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import LessonTable from "../components/LessonTable.jsx";
import LessonModal from "../components/LessonModal.jsx";
import Loading from "../components/Loading.jsx";
import { deleteLesson, getModules } from "../lib/api.js";

function Lessons() {
  const [modalVariant, setModalVariant] = useState("");
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingLesson, setEditingLesson] = useState(null);

  const refreshLessons = async () => {
    const response = await getModules();
    const nextModules = response.data || [];
    setModules(nextModules);
    setLessons(
      nextModules.flatMap((module) =>
        (module.lessons || []).map((lesson) => ({
          id: lesson.id,
          moduleId: module.id,
          title: lesson.title,
          module: module.title,
          lessonType: lesson.lessonType || "mixed",
          duration: lesson.duration || "N/A",
          thumbnail: lesson.thumbnail,
          lessonOrder: lesson.lessonOrder
        }))
      )
    );
  };

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getModules();
        if (!active) return;

        const nextModules = response.data || [];
        setModules(nextModules);
        setLessons(
          nextModules.flatMap((module) =>
            (module.lessons || []).map((lesson) => ({
              id: lesson.id,
              moduleId: module.id,
              title: lesson.title,
              module: module.title,
              lessonType: lesson.lessonType || "mixed",
              duration: lesson.duration || "N/A",
              thumbnail: lesson.thumbnail,
              lessonOrder: lesson.lessonOrder
            }))
          )
        );
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || "Failed to load lessons");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const handleEditLesson = (lesson) => {
    setEditingLesson(lesson);
    setModalVariant("lesson");
  };

  const handleDeleteLesson = async (lesson) => {
    const confirmed = window.confirm(`Delete "${lesson.title}"?`);
    if (!confirmed) return;

    try {
      await deleteLesson(lesson.id);
      await refreshLessons();
    } catch (requestError) {
      setError(requestError.message || "Failed to delete lesson");
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Lessons" actionLabel="Add lesson" onAction={() => setModalVariant("lesson")} />

      {error ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Loading label="Loading lessons" />
      ) : (
        <LessonTable lessons={lessons} onEdit={handleEditLesson} onDelete={handleDeleteLesson} />
      )}

      <LessonModal
        isOpen={Boolean(modalVariant)}
        onClose={() => {
          setModalVariant("");
          setEditingLesson(null);
        }}
        modules={modules}
        lessonToEdit={editingLesson}
        onCreated={async () => {
          setModalVariant("");
          setEditingLesson(null);
          await refreshLessons();
        }}
      />
    </section>
  );
}

export default Lessons;
