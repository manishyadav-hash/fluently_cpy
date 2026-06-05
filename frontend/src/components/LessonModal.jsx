import React, { useEffect, useMemo, useRef, useState } from "react";
import { createLesson, updateLesson, uploadLessonThumbnail } from "../lib/api.js";

const LESSON_TYPES = [
  { label: "Speaking", value: "speaking" },
  { label: "Audio", value: "audio" },
  { label: "Quiz", value: "quiz" },
  { label: "Match", value: "match" },
  { label: "Reading", value: "reading" },
  { label: "Writing", value: "writing" },
  { label: "Mixed", value: "mixed" }
];

const LESSON_LEVELS = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" }
];

const INITIAL_FORM = {
  moduleId: "",
  title: "",
  lessonOrder: "1",
  lessonType: "mixed",
  lessonLevel: "beginner",
  duration: ""
};

function LessonModal({ isOpen, onClose, modules = [], onCreated, lessonToEdit = null }) {
  const thumbnailInputRef = useRef(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setForm(INITIAL_FORM);
      setThumbnailFile(null);
      setThumbnailUrl("");
      setIsUploading(false);
      setIsSaving(false);
      setError("");
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    } else if (lessonToEdit) {
      setForm({
        moduleId: lessonToEdit.moduleId || modules[0]?.id || "",
        title: lessonToEdit.title || "",
        lessonOrder: String(lessonToEdit.lessonOrder || "1"),
        lessonType: lessonToEdit.lessonType || "mixed",
        lessonLevel: lessonToEdit.lessonLevel || "beginner",
        duration: lessonToEdit.duration === "N/A" ? "" : lessonToEdit.duration || ""
      });
      setThumbnailUrl(lessonToEdit.thumbnail || "");
      setThumbnailFile(null);
      setError("");
      setIsUploading(false);
      setIsSaving(false);
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    } else if (!form.moduleId && modules.length > 0) {
      setForm((current) => ({ ...current, moduleId: modules[0].id }));
    }
  }, [isOpen, modules, lessonToEdit]);

  const moduleOptions = useMemo(() => modules, [modules]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleThumbnailPick = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setThumbnailFile(file);
    setError("");
    setIsUploading(true);

    try {
      const response = await uploadLessonThumbnail(file);
      setThumbnailUrl(response.data?.thumbnail || "");
    } catch (uploadError) {
      setError(uploadError.message || "Thumbnail upload failed");
      setThumbnailFile(null);
      setThumbnailUrl("");
      if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.moduleId) {
      setError("Please select a module");
      return;
    }

    if (!form.title.trim()) {
      setError("Lesson title is required");
      return;
    }

    if (!form.lessonOrder.trim()) {
      setError("Lesson order is required");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const payload = {
        title: form.title.trim(),
        lesson_order: Number(form.lessonOrder),
        lesson_type: form.lessonType,
        lesson_level: form.lessonLevel,
        duration: form.duration.trim() || undefined,
        thumbnail: thumbnailUrl || undefined
      };

      if (lessonToEdit) {
        await updateLesson(lessonToEdit.id, payload);
      } else {
        await createLesson(form.moduleId, payload);
      }

      onCreated?.();
      onClose();
    } catch (createError) {
      setError(createError.message || "Failed to create lesson");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#27153e]/40 px-3 py-4 sm:items-center sm:px-4 sm:py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-[calc(100vw-0.75rem)] max-w-2xl rounded-2xl bg-white p-4 shadow-[0_28px_80px_rgba(124,92,255,0.18)] sm:w-full sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5] sm:text-xs sm:tracking-[0.3em]">Add lesson</p>
            <h3 className="mt-2 text-xl font-semibold text-[#2a1840] sm:text-2xl">
              {lessonToEdit ? "Edit lesson" : "New lesson"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#e7ddff] px-3 py-1 text-sm font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840]"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-[#5c4c72]">
            Lesson title
            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
              placeholder="Introduction to Tenses"
              required
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-[#5c4c72]">
              Module
              <select
                name="moduleId"
                value={form.moduleId}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                required
              >
                <option value="">Select module</option>
                {moduleOptions.map((module) => (
                  <option key={module.id} value={module.id}>
                    Week {module.weekNo} - {module.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[#5c4c72]">
              Lesson order
              <input
                name="lessonOrder"
                type="number"
                min="1"
                value={form.lessonOrder}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-[#5c4c72]">
              Lesson type
              <select
                name="lessonType"
                value={form.lessonType}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
              >
                {LESSON_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[#5c4c72]">
              Lesson level
              <select
                name="lessonLevel"
                value={form.lessonLevel}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
              >
                {LESSON_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium text-[#5c4c72]">
              Duration
              <input
                name="duration"
                value={form.duration}
                onChange={handleChange}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                placeholder="5 min"
              />
            </label>
          </div>

          <div className="rounded-[18px] border border-[#ece6fb] bg-[#fcfaff] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#2a1840]">Lesson thumbnail</p>
                <p className="mt-1 text-xs text-[#8f8aa3]">Upload a JPG or PNG image. The backend will store and serve the real URL.</p>
              </div>
              {thumbnailUrl ? (
                <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold text-[#67577f]">Uploaded</span>
              ) : null}
            </div>

            <input
              ref={thumbnailInputRef}
              accept="image/*"
              className="hidden"
              type="file"
              onChange={handleThumbnailPick}
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => thumbnailInputRef.current?.click()}
                className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(124,92,255,0.16)]"
              >
                {isUploading ? "Uploading..." : "Upload thumbnail"}
              </button>
              {thumbnailFile ? <span className="text-sm text-[#5c4c72]">{thumbnailFile.name}</span> : null}
            </div>

            {thumbnailUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-[#e7ddff]">
                <img src={thumbnailUrl} alt="Lesson thumbnail preview" className="h-40 w-full object-cover" />
              </div>
            ) : null}
          </div>

          {error ? (
            <div className="rounded-xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#e7ddff] px-4 py-2 text-sm font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(124,92,255,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Saving..." : lessonToEdit ? "Update lesson" : "Save lesson"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default LessonModal;
