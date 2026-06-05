import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../components/Navbar.jsx";
import QuestionTypeModal from "../components/QuestionTypeModal.jsx";
import Loading from "../components/Loading.jsx";
import { deleteQuestion, getModules, getLessonById } from "../lib/api.js";

const QUESTION_TYPES = [
  "MCQ",
  "True / False",
  "Fill in the Blanks",
  "Subjective",
  "Voice"
];

function getQuestionLabel(question) {
  const type = question.questionType;
  const optionTexts = (question.options || []).map((option) => option.optionText.toLowerCase());

  if (type === "single_choice" && optionTexts.length === 2) {
    const hasTrueFalse = optionTexts.includes("true") && optionTexts.includes("false");
    return hasTrueFalse ? "TRUE / FALSE" : "SINGLE_CHOICE";
  }

  return type.toUpperCase();
}

function getQuestionAnswer(question) {
  if (question.questionType === "mcq" || question.questionType === "single_choice") {
    const correctOption = (question.options || []).find((option) => option.isCorrect);
    return correctOption?.optionText || question.correctAnswer || "";
  }

  return question.correctAnswer || "";
}

function getQuestionEditorType(question) {
  if (!question) return "";

  if (question.questionType === "mcq") return "MCQ";
  if (question.questionType === "single_choice") return "True / False";
  if (question.questionType === "fill_in_blank") return "Fill in the Blanks";
  if (question.questionType === "text_to_speech") return "Subjective";
  if (question.questionType === "speak_to_text") return "Voice";

  return "MCQ";
}

function Questions() {
  const [activeType, setActiveType] = useState("");
  const [modules, setModules] = useState([]);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshToken, setRefreshToken] = useState(0);
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    let active = true;

    const loadModules = async () => {
      try {
        setIsLoading(true);
        setError("");
        const response = await getModules();
        if (!active) return;
        setModules(response.data || []);
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || "Failed to load questions");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    loadModules();

    return () => {
      active = false;
    };
  }, []);

  const contentTree = useMemo(() => {
    return modules.map((module) => ({
      module: module.title,
      lessons: (module.lessons || []).map((lesson) => ({
        lesson: lesson.title,
        lessonId: lesson.id,
        questions: lesson.questions || []
      }))
    }));
  }, [modules]);

  const getLessonQuestions = (lesson) => {
    if (selectedLesson?.id === lesson.lessonId) {
      return selectedLesson.questions || [];
    }

    return lesson.questions || [];
  };

  const handleSelectLesson = async (lessonId) => {
    try {
      setError("");
      setRefreshToken((current) => current + 1);
      const response = await getLessonById(lessonId);
      setSelectedLesson(response.data);
    } catch (requestError) {
      setError(requestError.message || "Failed to load lesson");
    }
  };

  const refreshCurrentLesson = async () => {
    if (!selectedLesson?.id) return;
    const response = await getLessonById(selectedLesson.id);
    setSelectedLesson(response.data);
  };

  const handleDeleteQuestion = async (questionId) => {
    const confirmed = window.confirm("Delete this question?");
    if (!confirmed) return;

    try {
      await deleteQuestion(questionId);
      await refreshCurrentLesson();
      const response = await getModules();
      setModules(response.data || []);
    } catch (requestError) {
      setError(requestError.message || "Failed to delete question");
    }
  };

  return (
    <section className="flex flex-col gap-6">
      <Navbar title="Questions" />

      {error ? (
        <div className="rounded-2xl border border-[#f2cfe4] bg-[#fff5f9] px-4 py-3 text-sm text-[#c2568c]">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[#2a1840]">Question builder</h3>
            <span className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">Type-driven</span>
          </div>
          <p className="mt-2 text-sm text-[#6e5f83]">
            Questions live inside lessons, which live inside modules. Use the type field to render MCQ,
            true/false, fill-in, subjective, or voice formats.
          </p>
          <div className="mt-4 flex flex-col gap-2">
            {QUESTION_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setActiveType(type)}
                className="rounded-xl border border-[#e7ddff] px-3 py-2 text-sm font-medium text-[#67577f] transition hover:-translate-y-0.5 hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840]"
              >
                Add {type}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <h3 className="text-lg font-semibold text-[#2a1840]">Content hierarchy</h3>
          <p className="mt-2 text-sm text-[#6e5f83]">Expand to view lessons and questions in order.</p>

          {isLoading ? (
            <div className="mt-6">
              <Loading label="Loading questions" />
            </div>
          ) : contentTree.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[#e7ddff] bg-[#fbf7ff] px-6 py-10 text-center">
              <p className="text-sm font-semibold text-[#5c4c72]">No content yet</p>
              <p className="mt-2 text-sm text-[#7d6b96]">Add modules and lessons to see questions here.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {contentTree.map((module) => (
                <details key={module.module} className="group rounded-xl border border-[#f0e8ff] bg-white px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[#2a1840]">
                    <span className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">Module</span>
                    <div className="mt-1 flex items-center justify-between">
                      <span>{module.module}</span>
                      <span className="text-xs text-[#b9a7d5]">{module.lessons.length} lessons</span>
                    </div>
                  </summary>
                  <div className="mt-3 space-y-3">
                    {module.lessons.map((lesson) => (
                      <details
                        key={`${module.module}-${lesson.lessonId}`}
                        className="rounded-lg border border-[#f0f0f0] bg-white/95 px-3 py-2"
                      >
                        <summary
                          className="cursor-pointer list-none text-sm font-semibold text-[#2a1840]"
                          onClick={async (event) => {
                            event.preventDefault();
                            await handleSelectLesson(lesson.lessonId);
                          }}
                        >
                          <span className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">Lesson</span>
                          <div className="mt-1 flex items-center justify-between">
                            <span>{lesson.lesson}</span>
                            <span className="text-xs text-[#b9a7d5]">{getLessonQuestions(lesson).length} questions</span>
                          </div>
                        </summary>
                        <ul className="mt-3 space-y-2">
                          {getLessonQuestions(lesson).map((question) => (
                            <li
                              key={question.id}
                              className="rounded-lg border border-[#e7ddff] bg-white px-3 py-2 text-sm text-[#5c4c72]"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#2a1840]">{getQuestionLabel(question)}:</span>
                                <span className="text-xs text-[#b9a7d5]">Order {question.questionOrder}</span>
                              </div>
                              <p className="mt-1">{question.question}</p>
                              {getQuestionAnswer(question) ? (
                                <p className="mt-1 text-xs text-[#8d7ca7]">
                                  Correct answer: <span className="font-semibold text-[#2a1840]">{getQuestionAnswer(question)}</span>
                                </p>
                              ) : null}
                              <div className="mt-2 flex flex-wrap gap-2">
                                {(question.options || []).map((option) => (
                                  <span
                                    key={option.id}
                                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                                      option.isCorrect
                                        ? "bg-[#ecfff4] text-[#127a46]"
                                        : "border border-[#e7ddff] bg-white text-[#6e5f83]"
                                    }`}
                                  >
                                    {option.optionText}
                                  </span>
                                ))}
                              </div>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setEditingQuestion(question);
                                  }}
                                  className="rounded-lg border border-[#e7ddff] px-3 py-1 text-xs font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff]"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handleDeleteQuestion(question.id);
                                  }}
                                  className="rounded-lg border border-[#f2cfe4] px-3 py-1 text-xs font-semibold text-[#c2568c] transition hover:border-[#f0b5d0] hover:bg-[#fff5f9]"
                                >
                                  Delete
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLesson ? (
        <div className="rounded-2xl border border-[#e7ddff] bg-white/88 p-5 shadow-[0_18px_50px_rgba(124,92,255,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#2a1840]">{selectedLesson.title}</h3>
              <p className="mt-1 text-sm text-[#7d6b96]">
                {selectedLesson.questions.length} questions in this lesson
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveType("MCQ")}
              className="rounded-xl bg-[#7c5cff] px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(124,92,255,0.28)] transition hover:-translate-y-0.5"
            >
              Add question
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {selectedLesson.questions.map((question) => (
              <div key={question.id} className="rounded-2xl border border-[#e7ddff] bg-[#fcfaff] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#b9a7d5]">{getQuestionLabel(question)}</p>
                    <p className="mt-1 text-sm font-semibold text-[#2a1840]">
                      {question.questionOrder}. {question.question}
                    </p>
                    {getQuestionAnswer(question) ? (
                      <p className="mt-1 text-xs text-[#8d7ca7]">
                        Correct answer: <span className="font-semibold text-[#2a1840]">{getQuestionAnswer(question)}</span>
                      </p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[#f0e8ff] px-3 py-1 text-xs font-semibold text-[#67577f]">
                    {(question.options || []).length} options
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(question.options || []).map((option) => (
                    <span
                      key={option.id}
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        option.isCorrect
                          ? "bg-[#ecfff4] text-[#127a46]"
                          : "border border-[#e7ddff] bg-white text-[#6e5f83]"
                      }`}
                    >
                      {option.optionText}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setEditingQuestion(question);
                    }}
                    className="rounded-lg border border-[#e7ddff] px-3 py-1 text-xs font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteQuestion(question.id);
                    }}
                    className="rounded-lg border border-[#f2cfe4] px-3 py-1 text-xs font-semibold text-[#c2568c] transition hover:border-[#f0b5d0] hover:bg-[#fff5f9]"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <QuestionTypeModal
        type={editingQuestion ? getQuestionEditorType(editingQuestion) : activeType}
        modules={modules}
        onClose={() => {
          setActiveType("");
          setEditingQuestion(null);
        }}
        onCreated={async () => {
          const response = await getModules();
          const nextModules = response.data || [];
          setModules(nextModules);

          if (selectedLesson?.id) {
            const lessonResponse = await getLessonById(selectedLesson.id);
            setSelectedLesson(lessonResponse.data);
          }

          setRefreshToken((current) => current + 1);
          setEditingQuestion(null);
        }}
        questionToEdit={editingQuestion}
      />
    </section>
  );
}

export default Questions;
