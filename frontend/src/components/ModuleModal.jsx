import React, { useEffect, useState } from "react";

const INITIAL_FORM = {
  title: "",
  description: "",
  week_no: ""
};

function ModuleModal({
  isOpen,
  onClose,
  onSubmit,
  isSaving = false,
  error = "",
  moduleToEdit = null
}) {
  const [form, setForm] = useState(INITIAL_FORM);

  useEffect(() => {
    if (isOpen) {
      if (moduleToEdit) {
        setForm({
          title: moduleToEdit.title || "",
          description: moduleToEdit.description || "",
          week_no: moduleToEdit.weekNo || ""
        });
      } else {
        setForm(INITIAL_FORM);
      }
    }
  }, [isOpen, moduleToEdit]);

  if (!isOpen) return null;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    onSubmit?.({
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      week_no: Number(form.week_no)
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#27153e]/45 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-8">
      <div className="w-[calc(100vw-0.75rem)] max-w-2xl overflow-hidden rounded-[1.75rem] border border-[#e7ddff] bg-white shadow-[0_28px_80px_rgba(124,92,255,0.18)] sm:w-full">
        <div className="h-1 w-full bg-gradient-to-r from-[#7c5cff] via-[#a988ff] to-[#ff9f68]" />
        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5] sm:text-xs sm:tracking-[0.3em]">Module details</p>
              <h3 className="mt-2 text-xl font-semibold text-[#2a1840] sm:text-2xl">
                {moduleToEdit ? "Edit module" : "Create module"}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg border border-[#e7ddff] px-3 py-1 text-sm font-semibold text-[#67577f] transition hover:-translate-y-0.5 hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840] hover:shadow-[0_10px_24px_rgba(124,92,255,0.12)]"
            >
              Close
            </button>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-[#5c4c72]">
              Module title
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
                className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 text-[#2a1840] outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                placeholder="Define Tenses"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#5c4c72]">
                Week no
                <input
                  name="week_no"
                  type="number"
                  min="1"
                  value={form.week_no}
                  onChange={handleChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 text-[#2a1840] outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                  placeholder="1"
                />
              </label>
            </div>

            <label className="block text-sm font-medium text-[#5c4c72]">
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="mt-2 min-h-[120px] w-full rounded-2xl border border-[#e7ddff] bg-[#fcfaff] px-4 py-3 text-[#2a1840] outline-none transition focus:border-[#7c5cff] focus:bg-white focus:ring-4 focus:ring-[#7c5cff]/10"
                rows="4"
                placeholder="Learn basic spoken English tense concepts"
              />
            </label>

            {error ? (
              <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-[#e7ddff] px-4 py-2 text-sm font-semibold text-[#67577f] transition hover:-translate-y-0.5 hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840] hover:shadow-[0_10px_24px_rgba(124,92,255,0.12)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:-translate-y-0.5 hover:bg-[#6c4cf0] hover:shadow-[0_18px_36px_rgba(124,92,255,0.3)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSaving ? "Saving..." : moduleToEdit ? "Update module" : "Save module"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ModuleModal;
