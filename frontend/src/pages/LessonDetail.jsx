import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Loading from "../components/Loading.jsx";
import { getLessonById } from "../lib/api.js";

function LessonDetail() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadLesson = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getLessonById(lessonId);
        if (!active) return;
        setLesson(response.data);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || "Failed to load lesson");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadLesson();

    return () => {
      active = false;
    };
  }, [lessonId]);

  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Lesson detail" actionLabel="Back to modules" onAction={() => window.history.back()} />

      {isLoading ? <Loading label="Loading lesson" /> : null}

      {error ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {error}
        </div>
      ) : null}

      {!isLoading && lesson ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
            <p className="text-xs uppercase tracking-[0.3em] text-[#b9a7d5]">
              {lesson.module?.title || "Module"} · Lesson {lesson.lessonOrder}
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-[#2a1840]">{lesson.title}</h1>
            <p className="mt-2 text-sm text-[#6e5f83]">
              {lesson.lessonType || "mixed"} · {lesson.duration || "No duration"} · {lesson.questions.length} questions
            </p>

            <div className="mt-5 overflow-hidden rounded-2xl border border-[#e7ddff] bg-[#fcfaff]">
              <img
                src={lesson.thumbnail || "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80"}
                alt={lesson.title}
                className="h-72 w-full object-cover"
              />
            </div>

            <div className="mt-5 rounded-2xl border border-[#e7ddff] bg-[#fcfaff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b9a7d5]">Lesson meta</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-[#8d7ca7]">Type</p>
                  <p className="mt-1 font-semibold text-[#2a1840]">{lesson.lessonType || "mixed"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8d7ca7]">Duration</p>
                  <p className="mt-1 font-semibold text-[#2a1840]">{lesson.duration || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8d7ca7]">Order</p>
                  <p className="mt-1 font-semibold text-[#2a1840]">{lesson.lessonOrder}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[#2a1840]">Questions</h2>
                <p className="mt-1 text-sm text-[#7d6b96]">Manage questions inside this lesson.</p>
              </div>
              <Link
                to="/questions"
                className="rounded-xl border border-[#e7ddff] px-4 py-2 text-sm font-semibold text-[#67577f] transition hover:border-[#cdb7ff] hover:bg-[#f7f2ff]"
              >
                Open builder
              </Link>
            </div>

            {lesson.questions.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-[#e7ddff] bg-[#fbf7ff] px-6 py-10 text-center">
                <p className="text-sm font-semibold text-[#5c4c72]">No questions yet</p>
                <p className="mt-2 text-sm text-[#7d6b96]">Add the first question for this lesson.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {lesson.questions.map((question) => (
                  <article
                    key={question.id}
                    className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] p-4 shadow-[0_10px_24px_rgba(124,92,255,0.05)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.22em] text-[#b9a7d5]">
                          {question.questionType}
                        </p>
                        <h3 className="mt-1 text-sm font-semibold text-[#2a1840]">
                          {question.questionOrder}. {question.question}
                        </h3>
                      </div>
                      <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold text-[#67577f]">
                        {question.options.length} options
                      </span>
                    </div>

                    {question.options.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {question.options.map((option) => (
                          <span
                            key={option.id}
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              option.isCorrect
                                ? "bg-[#ecfff4] text-[#127a46]"
                                : "bg-white text-[#6e5f83] border border-[#e7ddff]"
                            }`}
                          >
                            {option.optionText}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default LessonDetail;
