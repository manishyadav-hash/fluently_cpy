import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Loading from "../components/Loading.jsx";
import { createCourse, deleteCourse, getCourses, updateCourse } from "../lib/api.js";

const INITIAL_FORM = {
  title: "",
  description: "",
  thumbnail_url: "",
  level: "beginner",
  audience: "general_learner",
  duration_weeks: 4,
  status: "draft"
};

const AUDIENCE_LABELS = {
  student: "Student",
  college_student: "College Student",
  job_seeker: "Job Seeker",
  working_professional: "Working Professional",
  business_professional: "Business Professional",
  general_learner: "General Learner"
};

function Courses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await getCourses();
      setCourses(response.data || []);
    } catch (e) {
      setError(e.message || "Failed to load courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const stats = useMemo(
    () => ({
      totalCourses: courses.length,
      published: courses.filter((course) => course.status === "published").length,
      lessons: courses.reduce((count, course) => count + (course.lessonsCount || 0), 0),
      weeks: courses.reduce((count, course) => count + (course.weeksCount || 0), 0)
    }),
    [courses]
  );

  const openCreate = () => {
    setSubmitError("");
    setEditingCourse(null);
    setForm(INITIAL_FORM);
    setShowForm(true);
  };

  const openEdit = (course) => {
    setSubmitError("");
    setEditingCourse(course);
    setForm({
      title: course.title || "",
      description: course.description || "",
      thumbnail_url: course.thumbnail_url || "",
      level: course.level || "beginner",
      duration_weeks: course.durationWeeks || 4,
      audience: course.audience || "general_learner",
      status: course.status || "draft"
    });
    setShowForm(true);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      setSaving(true);
      setSubmitError("");
      const payload = {
        ...form,
        duration_weeks: Number(form.duration_weeks)
      };

      if (editingCourse) {
        await updateCourse(editingCourse.id, payload);
      } else {
        await createCourse(payload);
      }

      setShowForm(false);
      setEditingCourse(null);
      setForm(INITIAL_FORM);
      await loadCourses();
    } catch (e) {
      setSubmitError(e.message || "Failed to save course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (course) => {
    const confirmed = window.confirm(`Delete course "${course.title}"?`);
    if (!confirmed) return;

    try {
      setError("");
      await deleteCourse(course.id);
      await loadCourses();
    } catch (e) {
      setError(e.message || "Failed to delete course");
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Courses" actionLabel="Add course" onAction={openCreate} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Total courses</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{stats.totalCourses}</p>
        </div>
        <div className="rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Published</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{stats.published}</p>
        </div>
        <div className="rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Weeks</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{stats.weeks}</p>
        </div>
        <div className="rounded-3xl border border-[#e7ddff] bg-white/90 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <p className="text-xs uppercase tracking-[0.28em] text-[#b9a7d5]">Linked lessons</p>
          <p className="mt-3 text-3xl font-semibold text-[#2a1840]">{stats.lessons}</p>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Loading label="Loading courses" />
      ) : courses.length === 0 ? (
        <div className="rounded-[1.75rem] border border-dashed border-[#e7ddff] bg-white/84 px-6 py-14 text-center shadow-[0_18px_50px_rgba(124,92,255,0.04)]">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#b9a7d5]">No courses yet</p>
          <p className="mt-3 text-sm text-[#6e5f83]">Create your first course to start organizing weeks and reusable lessons.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group overflow-hidden rounded-[1.75rem] border border-[#e7ddff] bg-white/92 shadow-[0_18px_50px_rgba(124,92,255,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(124,92,255,0.1)]"
            >
              <div className="h-1 w-full bg-gradient-to-r from-[#7c5cff] via-[#a988ff] to-[#ff9f68]" />
              <button
                type="button"
                onClick={() => navigate(`/courses/${course.id}`)}
                className="block w-full p-5 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-[#b9a7d5]">{course.level}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#2a1840]">{course.title}</h3>
                </div>
                  <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold capitalize text-[#7c5cff]">
                    {course.status}
                  </span>
                </div>

                <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#6e5f83]">
                  {course.description || "No description yet."}
                </p>

                <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-[#7d6b96]">
                  <span className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-3 py-2 text-center">
                    {course.durationWeeks} weeks
                  </span>
                  <span className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-3 py-2 text-center">
                    {course.weeksCount || 0} weeks
                  </span>
                  <span className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-3 py-2 text-center">
                    {course.lessonsCount || 0} lessons
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-[#e7ddff] bg-[#fcfaff] px-3 py-1 text-xs font-medium text-[#67577f]">
                    Audience: {AUDIENCE_LABELS[course.audience] || course.audience || "General Learner"}
                  </span>
                </div>
              </button>

              <div className="flex items-center justify-between gap-2 border-t border-[#efe7ff] px-5 py-3">
                <button
                  type="button"
                  onClick={() => openEdit(course)}
                  className="rounded-xl border border-[#e7ddff] px-3 py-2 text-sm font-semibold text-[#67577f] transition hover:bg-[#f7f2ff]"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(course)}
                  className="rounded-xl border border-[#f2cfe4] px-3 py-2 text-sm font-semibold text-[#c2568c] transition hover:bg-[#fff5f9]"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/courses/${course.id}`)}
                  className="ml-auto rounded-xl bg-[#7c5cff] px-3 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#6c4cf0]"
                >
                  Open
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#27153e]/45 px-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-2xl overflow-hidden rounded-[1.75rem] border border-[#e7ddff] bg-white shadow-[0_28px_80px_rgba(124,92,255,0.18)]"
          >
            <div className="h-1 w-full bg-gradient-to-r from-[#7c5cff] via-[#a988ff] to-[#ff9f68]" />
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5]">Course details</p>
                  <h3 className="mt-2 text-2xl font-semibold text-[#2a1840]">
                    {editingCourse ? "Edit course" : "Create course"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCourse(null);
                    setSubmitError("");
                  }}
                  className="rounded-lg border border-[#e7ddff] px-3 py-2 text-sm font-semibold text-[#67577f] transition hover:bg-[#f7f2ff]"
                >
                  Close
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-[#5c4c72] md:col-span-2">
                  Title
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  />
                </label>

                <label className="block text-sm font-medium text-[#5c4c72] md:col-span-2">
                  Description
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="4"
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  />
                </label>

                <label className="block text-sm font-medium text-[#5c4c72] md:col-span-2">
                  Thumbnail URL
                  <input
                    name="thumbnail_url"
                    value={form.thumbnail_url}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  />
                </label>

                <label className="block text-sm font-medium text-[#5c4c72]">
                  Level
                  <select
                    name="level"
                    value={form.level}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-[#5c4c72]">
                  Audience
                  <select
                    name="audience"
                    value={form.audience}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  >
                    <option value="student">Student</option>
                    <option value="college_student">College Student</option>
                    <option value="job_seeker">Job Seeker</option>
                    <option value="working_professional">Working Professional</option>
                    <option value="business_professional">Business Professional</option>
                    <option value="general_learner">General Learner</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-[#5c4c72]">
                  Duration weeks
                  <input
                    name="duration_weeks"
                    type="number"
                    min="1"
                    value={form.duration_weeks}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  />
                </label>

                <label className="block text-sm font-medium text-[#5c4c72]">
                  Status
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>
              </div>

              {submitError ? (
                <div className="mt-5 rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
                  {submitError}
                </div>
              ) : null}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingCourse(null);
                    setSubmitError("");
                  }}
                  className="rounded-xl border border-[#e7ddff] px-4 py-2 text-sm font-semibold text-[#67577f] transition hover:bg-[#f7f2ff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:bg-[#6c4cf0] disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {saving ? "Saving..." : editingCourse ? "Update course" : "Create course"}
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default Courses;
