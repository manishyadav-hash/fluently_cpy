import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Loading from "../components/Loading.jsx";
import {
  addLessonToWeek,
  getAllLessons,
  getCourseById,
  removeLessonFromWeek,
  reorderWeekLessons
} from "../lib/api.js";

function badgeClass(level) {
  if (level === "advanced") return "bg-[#fff1eb] text-[#c96535]";
  if (level === "intermediate") return "bg-[#eef7ff] text-[#3377c8]";
  return "bg-[#f0e8ff] text-[#7c5cff]";
}

function statusClass(status) {
  return status === "published"
    ? "bg-[#eaf9f0] text-[#2f8f5b]"
    : "bg-[#fff5e8] text-[#b66a1a]";
}

function levelLabel(level) {
  if (level === "intermediate") return "Intermediate";
  if (level === "advanced") return "Advanced";
  return "Beginner";
}

function audienceLabel(audience) {
  const labels = {
    student: "Student",
    college_student: "College Student",
    job_seeker: "Job Seeker",
    working_professional: "Working Professional",
    business_professional: "Business Professional",
    general_learner: "General Learner"
  };
  return labels[audience] || "General Learner";
}

function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-[#e7ddff] bg-white/80 px-4 py-3 shadow-[0_12px_36px_rgba(124,92,255,0.05)]">
      <p className="text-[10px] uppercase tracking-[0.26em] text-[#b9a7d5]">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-2xl font-semibold text-[#2a1840]">{value}</p>
        {hint ? <span className="text-xs text-[#8d7ca7]">{hint}</span> : null}
      </div>
    </div>
  );
}

function LessonPickerPopover({
  anchorRef,
  popoverRef,
  open,
  searchTerm,
  onSearch,
  filteredLessons,
  selectedLessonId,
  onSelect,
  onClose,
  title
}) {
  const [position, setPosition] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return undefined;
    const updatePosition = () => {
      const rect = anchorRef.current.getBoundingClientRect();
      const width = Math.min(360, Math.max(320, rect.width));
      const viewportPadding = 16;
      const preferredHeight = 360;
      const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
      const height = Math.max(220, Math.min(preferredHeight, spaceBelow || preferredHeight));
      const top = Math.min(window.innerHeight - height - viewportPadding, rect.bottom + 10);
      const left = Math.min(window.innerWidth - width - 16, Math.max(16, rect.right - width));
      setPosition({ left, top, width, height });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [anchorRef, open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open || !position || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-[70] overflow-hidden rounded-[1.35rem] border border-[#e7ddff] bg-white shadow-[0_24px_60px_rgba(124,92,255,0.16)]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        maxHeight: position.height
      }}
    >
      <div className="border-b border-[#efe7ff] p-3">
        <div className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-3 py-2 focus-within:border-[#7c5cff] focus-within:ring-4 focus-within:ring-[#7c5cff]/10">
          <input
            autoFocus
            value={searchTerm}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={title}
            className="w-full bg-transparent text-sm text-[#2a1840] outline-none placeholder:text-[#b9a7d5]"
          />
        </div>
      </div>

      <div className="overflow-y-auto p-2" style={{ maxHeight: Math.max(160, position.height - 78) }}>
        {filteredLessons.length > 0 ? (
          filteredLessons.map((lesson) => (
            <button
              key={lesson.id}
              type="button"
              onClick={() => onSelect(lesson.id)}
              className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-[#f7f2ff] ${
                selectedLessonId === lesson.id ? "bg-[#f0e8ff]" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2a1840]">{lesson.title}</p>
                <p className="mt-1 text-xs text-[#8d7ca7]">
                  {lesson.lessonType || "mixed"} · {lesson.duration || "no duration"}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#eef7ff] px-3 py-1 text-[11px] font-semibold capitalize text-[#3377c8]">
                {lesson.lessonLevel || "beginner"}
              </span>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-[#e7ddff] bg-[#fcfaff] px-4 py-8 text-center">
            <p className="text-sm font-semibold text-[#5c4c72]">No matching lessons</p>
            <p className="mt-1 text-sm text-[#8d7ca7]">Try another keyword or create a new lesson.</p>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function CourseDetail() {
  const { courseId } = useParams();
  const scrollYRef = useRef(0);
  const initializedWeekIdsRef = useRef(false);
  const lessonButtonRefs = useRef({});
  const lessonPopoverRefs = useRef({});
  const openWeeksStorageKey = `course-detail-open-weeks:${courseId}`;
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingWeekId, setSavingWeekId] = useState("");
  const [selectedLessons, setSelectedLessons] = useState({});
  const [lessonSearchTerms, setLessonSearchTerms] = useState({});
  const [openPickerWeekIds, setOpenPickerWeekIds] = useState(new Set());
  const [openWeekIds, setOpenWeekIds] = useState(new Set());
  const [pageError, setPageError] = useState("");

  const load = async ({ background = false } = {}) => {
    try {
      if (background) setRefreshing(true);
      else setLoading(true);
      setPageError("");
      const [courseRes, lessonsRes] = await Promise.all([getCourseById(courseId), getAllLessons()]);
      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);
      if (!initializedWeekIdsRef.current) {
        const storedWeekIds = window.localStorage.getItem(openWeeksStorageKey);
        if (storedWeekIds) {
          setOpenWeekIds(new Set(JSON.parse(storedWeekIds)));
        } else {
          const firstWeek = courseRes.data?.weeks?.[0];
          setOpenWeekIds(firstWeek ? new Set([firstWeek.id]) : new Set());
        }
        initializedWeekIdsRef.current = true;
      }
    } catch (error) {
      setPageError(error.message || "Failed to load course");
    } finally {
      if (background) setRefreshing(false);
      else setLoading(false);
    }
  };

  const reloadWithoutScrollJump = async () => {
    scrollYRef.current = window.scrollY;
    await load({ background: true });
    requestAnimationFrame(() => {
      window.scrollTo({ top: scrollYRef.current, behavior: "auto" });
    });
  };

  useEffect(() => {
    load();
  }, [courseId]);

  useEffect(() => {
    if (!courseId || !initializedWeekIdsRef.current) return;
    window.localStorage.setItem(openWeeksStorageKey, JSON.stringify([...openWeekIds]));
  }, [courseId, openWeekIds, openWeeksStorageKey]);

  const stats = useMemo(() => {
    const totalWeeks = course?.weeks?.length || 0;
    const totalLessons = course?.weeks?.reduce((count, week) => count + (week.weekLessons?.length || 0), 0) || 0;
    const emptyWeeks = course?.weeks?.filter((week) => !week.weekLessons?.length).length || 0;
    return { totalWeeks, totalLessons, emptyWeeks };
  }, [course]);

  const filteredLessons = useMemo(() => {
    const courseLevel = course?.level || "beginner";
    return lessons.filter((lesson) => (lesson.lessonLevel || "beginner") === courseLevel);
  }, [course?.level, lessons]);

  const getFilteredLessonsForWeek = (weekId) => {
    const term = (lessonSearchTerms[weekId] || "").trim().toLowerCase();
    return filteredLessons.filter((lesson) => {
      if (!term) return true;
      return lesson.title.toLowerCase().includes(term) || (lesson.lessonType || "").toLowerCase().includes(term);
    });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      const isInsideTrigger = Object.values(lessonButtonRefs.current).some(
        (ref) => ref && ref.contains && ref.contains(event.target)
      );
      const isInsidePopover = Object.values(lessonPopoverRefs.current).some(
        (ref) => ref && ref.contains && ref.contains(event.target)
      );
      if (!isInsideTrigger && !isInsidePopover) setOpenPickerWeekIds(new Set());
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleAdd = async (week) => {
    const lessonId = selectedLessons[week.id];
    if (!lessonId) return;

    try {
      setSavingWeekId(week.id);
      const nextOrder = (week.weekLessons?.length || 0) + 1;
      await addLessonToWeek(week.id, { lesson_id: lessonId, lesson_order: nextOrder });
      setSelectedLessons((current) => ({ ...current, [week.id]: "" }));
      setLessonSearchTerms((current) => ({ ...current, [week.id]: "" }));
      setOpenPickerWeekIds(new Set());
      setOpenWeekIds((current) => new Set([...current, week.id]));
      await reloadWithoutScrollJump();
    } finally {
      setSavingWeekId("");
    }
  };

  const moveLesson = async (week, index, direction) => {
    const items = [...week.weekLessons];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    [items[index], items[targetIndex]] = [items[targetIndex], items[index]];

    try {
      setSavingWeekId(week.id);
      await reorderWeekLessons(week.id, {
        lessons: items.map((item, idx) => ({ id: item.id, lessonOrder: idx + 1 }))
      });
      await reloadWithoutScrollJump();
    } finally {
      setSavingWeekId("");
    }
  };

  const handleRemove = async (weekLessonId) => {
    try {
      setSavingWeekId("remove");
      await removeLessonFromWeek(weekLessonId);
      await reloadWithoutScrollJump();
    } finally {
      setSavingWeekId("");
    }
  };

  if (loading || !course) {
    return <Loading label="Loading course" />;
  }

  return (
    <section className="flex flex-col gap-5">
      <Navbar title={course.title} />

      {pageError ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {pageError}
        </div>
      ) : null}

      <div className="rounded-[1.75rem] border border-[#e7ddff] bg-white/90 shadow-[0_24px_70px_rgba(124,92,255,0.08)]">
        <div className="h-1 w-full bg-gradient-to-r from-[#7c5cff] via-[#a988ff] to-[#ff9f68]" />
        <div className="flex flex-col gap-4 p-5 sm:p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${badgeClass(course.level)}`}>
                {course.level}
              </span>
              <span className="rounded-full border border-[#e7ddff] bg-white px-3 py-1 text-xs font-semibold text-[#67577f]">
                {audienceLabel(course.audience)}
              </span>
              <span className="rounded-full border border-[#e7ddff] bg-white px-3 py-1 text-xs font-semibold text-[#67577f]">
                {course.durationWeeks} weeks
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statusClass(course.status)}`}>
                {course.status}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#2a1840] sm:text-[2.15rem]">{course.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6e5f83]">
              {course.description || "No course description yet."}
            </p>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
            <StatTile label="Weeks" value={stats.totalWeeks} />
            <StatTile label="Lessons" value={stats.totalLessons} />
            <StatTile label="Empty" value={stats.emptyWeeks} />
            <StatTile label="Status" value={course.status} hint="course state" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-[#e7ddff] bg-white/80 px-4 py-3 shadow-[0_12px_36px_rgba(124,92,255,0.05)]">
        <div>
          <p className="text-[10px] uppercase tracking-[0.26em] text-[#b9a7d5]">Structure</p>
          <p className="text-sm text-[#6e5f83]">Expandable weeks with reusable lessons and reorder controls.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-[#e7ddff] bg-white px-3 py-1 text-[#67577f]">Weeks: {stats.totalWeeks}</span>
          <span className="rounded-full border border-[#e7ddff] bg-white px-3 py-1 text-[#67577f]">Lessons: {stats.totalLessons}</span>
        </div>
      </div>

      {refreshing ? (
        <div className="fixed bottom-6 right-6 z-50 rounded-full border border-[#e7ddff] bg-white px-4 py-2 text-xs font-semibold text-[#67577f] shadow-[0_18px_50px_rgba(124,92,255,0.12)]">
          Updating course...
        </div>
      ) : null}

      <div className="space-y-3">
        {course.weeks.map((week) => (
          <details
            key={week.id}
            className="group overflow-hidden rounded-[1.45rem] border border-[#e7ddff] bg-white/92 shadow-[0_16px_44px_rgba(124,92,255,0.05)]"
            open={openWeekIds.has(week.id)}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 sm:px-5"
              onClick={(event) => {
                event.preventDefault();
                setOpenWeekIds((current) => {
                  const next = new Set(current);
                  if (next.has(week.id)) next.delete(week.id);
                  else next.add(week.id);
                  return next;
                });
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0e8ff] text-sm font-semibold text-[#7c5cff]">
                  {String(week.weekNo).padStart(2, "0")}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5]">Week {week.weekNo}</p>
                  <h3 className="text-base font-semibold text-[#2a1840]">{week.title || `Week ${week.weekNo}`}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold text-[#67577f]">
                  {week.weekLessons.length}
                </span>
                <svg className="h-4 w-4 text-[#b9a7d5] transition group-open:rotate-180" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.943l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0l-4.24-4.24a.75.75 0 0 1 .02-1.06Z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </summary>

            <div className="border-t border-[#efe7ff] px-4 py-4 sm:px-5">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b9a7d5]">Add existing lesson</p>
                  <p className="mt-1 text-sm text-[#6e5f83]">
                    Showing {levelLabel(course.level)} lessons only. This keeps the course structure aligned with the course level.
                  </p>
                </div>

                <div className="flex w-full flex-col gap-2 lg:max-w-[420px] sm:flex-row sm:items-end">
                  <div className="w-full">
                    <label className="block w-full text-sm font-medium text-[#5c4c72]">
                      Lesson
                      <button
                        ref={(node) => {
                          lessonButtonRefs.current[week.id] = node;
                        }}
                        type="button"
                        onClick={() => {
                          const trigger = lessonButtonRefs.current[week.id];
                          if (trigger) {
                            const rect = trigger.getBoundingClientRect();
                            const spaceBelow = window.innerHeight - rect.bottom - 16;
                            if (spaceBelow < 260) {
                              trigger.scrollIntoView({ block: "center", behavior: "smooth" });
                            }
                          }
                          setOpenPickerWeekIds((current) => {
                            const next = new Set();
                            if (!current.has(week.id)) next.add(week.id);
                            return next;
                          });
                        }}
                        className="mt-2 flex w-full items-center justify-between gap-3 rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 text-left text-sm text-[#2a1840] outline-none transition hover:border-[#cdb7ff] hover:bg-white focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                      >
                        <span className="truncate">
                          {filteredLessons.find((lesson) => lesson.id === selectedLessons[week.id])?.title || "Choose a lesson"}
                        </span>
                        <svg className="h-4 w-4 shrink-0 text-[#8d7ca7]" viewBox="0 0 20 20" fill="currentColor">
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 10.943l3.71-3.71a.75.75 0 1 1 1.06 1.06l-4.24 4.24a.75.75 0 0 1-1.06 0l-4.24-4.24a.75.75 0 0 1 .02-1.06Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdd(week)}
                    disabled={savingWeekId === week.id}
                    className="rounded-xl bg-[#7c5cff] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(124,92,255,0.24)] transition hover:bg-[#6c4cf0] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {savingWeekId === week.id ? "Adding..." : "Add"}
                  </button>
                </div>
              </div>

              <LessonPickerPopover
                anchorRef={{ current: lessonButtonRefs.current[week.id] }}
                popoverRef={(node) => {
                  lessonPopoverRefs.current[week.id] = node;
                }}
                open={openPickerWeekIds.has(week.id)}
                searchTerm={lessonSearchTerms[week.id] || ""}
                onSearch={(value) =>
                  setLessonSearchTerms((current) => ({
                    ...current,
                    [week.id]: value
                  }))
                }
                filteredLessons={getFilteredLessonsForWeek(week.id)}
                selectedLessonId={selectedLessons[week.id]}
                onSelect={(lessonId) => {
                  setSelectedLessons((current) => ({
                    ...current,
                    [week.id]: lessonId
                  }));
                  setLessonSearchTerms((current) => ({
                    ...current,
                    [week.id]: ""
                  }));
                  setOpenPickerWeekIds(new Set());
                }}
                onClose={() => setOpenPickerWeekIds(new Set())}
                title={`Search ${levelLabel(course.level).toLowerCase()} lessons...`}
              />

              <div className="mt-4">
                {filteredLessons.length === 0 ? (
                  <div className="mb-3 rounded-2xl border border-dashed border-[#e7ddff] bg-[#fcfaff] px-4 py-5 text-center">
                    <p className="text-sm font-semibold text-[#5c4c72]">
                      No {levelLabel(course.level).toLowerCase()} lessons available
                    </p>
                    <p className="mt-1 text-sm text-[#8d7ca7]">
                      Create lessons with the same level to make them available here.
                    </p>
                  </div>
                ) : null}

                {week.weekLessons.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-[#e7ddff] bg-[#fcfaff] px-4 py-6 text-center">
                    <p className="text-sm font-semibold text-[#5c4c72]">No lessons in this week</p>
                    <p className="mt-1 text-sm text-[#8d7ca7]">Add one from the dropdown above.</p>
                  </div>
                ) : (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                    {week.weekLessons.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-3 rounded-2xl border border-[#e7ddff] bg-white px-4 py-3 shadow-[0_8px_24px_rgba(124,92,255,0.04)] sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#f0e8ff] text-xs font-semibold text-[#7c5cff]">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#2a1840]">{entry.lesson.title}</p>
                            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#8d7ca7]">
                              <span className="rounded-full border border-[#e7ddff] bg-[#fcfaff] px-2.5 py-1 capitalize">
                                {entry.lesson.lessonType || "mixed"}
                              </span>
                              <span className="rounded-full border border-[#e7ddff] bg-[#fcfaff] px-2.5 py-1">
                                {entry.lesson.duration || "no duration"}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveLesson(week, index, -1)}
                            disabled={savingWeekId === week.id}
                            className="rounded-lg border border-[#e7ddff] px-3 py-1.5 text-xs font-semibold text-[#67577f] transition hover:bg-[#f7f2ff] disabled:opacity-50"
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            onClick={() => moveLesson(week, index, 1)}
                            disabled={savingWeekId === week.id}
                            className="rounded-lg border border-[#e7ddff] px-3 py-1.5 text-xs font-semibold text-[#67577f] transition hover:bg-[#f7f2ff] disabled:opacity-50"
                          >
                            Down
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(entry.id)}
                            disabled={savingWeekId === "remove"}
                            className="rounded-lg border border-[#f2cfe4] px-3 py-1.5 text-xs font-semibold text-[#c2568c] transition hover:bg-[#fff5f9] disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export default CourseDetail;
