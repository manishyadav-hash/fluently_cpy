import React from "react";

function LessonTable({ lessons = [], onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#2a1840]">Lesson Pipeline</h3>
      </div>
      {lessons.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-[#e7ddff] bg-[#fbf7ff] px-6 py-10 text-center">
          <p className="text-sm font-semibold text-[#5c4c72]">No lessons yet</p>
          <p className="mt-2 text-sm text-[#7d6b96]">Add a lesson to start building your content flow.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">
              <tr>
                <th className="pb-3">Title</th>
                <th className="pb-3">Module</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Duration</th>
                <th className="pb-3">Order</th>
                <th className="pb-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[#5c4c72]">
              {lessons.map((lesson) => (
                <tr key={lesson.id || lesson.title} className="border-t border-[#f0e8ff]">
                  <td className="py-3 font-medium text-[#2a1840]">{lesson.title}</td>
                  <td className="py-3">{lesson.module}</td>
                  <td className="py-3">
                    <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold capitalize text-[#67577f]">
                      {lesson.lessonType}
                    </span>
                  </td>
                  <td className="py-3">{lesson.duration}</td>
                  <td className="py-3">{lesson.lessonOrder}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onEdit?.(lesson)}
                        className="rounded-lg border border-[#e7ddff] px-3 py-1 text-xs font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff]"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete?.(lesson)}
                        className="rounded-lg border border-[#f2cfe4] px-3 py-1 text-xs font-semibold text-[#c2568c] transition hover:border-[#f0b5d0] hover:bg-[#fff5f9]"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default LessonTable;
