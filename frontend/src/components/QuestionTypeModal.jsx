import React, { useEffect, useMemo, useState } from "react";
import { createQuestion, createQuestionOption, updateQuestion } from "../lib/api.js";

const QUESTION_TYPES = {
  MCQ: "mcq",
  "True / False": "single_choice",
  "Fill in the Blanks": "fill_in_blank",
  Subjective: "text_to_speech",
  Voice: "speak_to_text"
};

function QuestionTypeModal({ type, modules = [], onClose, onCreated, questionToEdit = null }) {
  const [moduleId, setModuleId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [questionOrder, setQuestionOrder] = useState("1");
  const [question, setQuestion] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [options, setOptions] = useState([""]);
  const [correctIndexes, setCorrectIndexes] = useState([]);
  const [trueFalseValue, setTrueFalseValue] = useState("true");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const moduleOptions = useMemo(() => modules, [modules]);
  const selectedModule = moduleOptions.find((module) => module.id === moduleId);
  const lessonOptions = selectedModule?.lessons || [];

  useEffect(() => {
    if (type) {
      const isEdit = Boolean(questionToEdit);
      const editOptions = (questionToEdit?.options || []).map((option) => option.optionText);
      setQuestion(questionToEdit?.question || "");
      setCorrectAnswer(questionToEdit?.correctAnswer || "");
      setAudioUrl(questionToEdit?.audioUrl || "");
      setImageUrl(questionToEdit?.imageUrl || "");
      setQuestionOrder(String(questionToEdit?.questionOrder || 1));
      setOptions(
        isEdit
          ? (editOptions.length > 0 ? editOptions : (type === "True / False" ? ["True", "False"] : [""]))
          : (type === "True / False" ? ["True", "False"] : [""])
      );
      setCorrectIndexes(
        isEdit
          ? (questionToEdit?.options || [])
              .map((option, index) => (option.isCorrect ? index : -1))
              .filter((index) => index >= 0)
          : []
      );
      setError("");
      setIsSaving(false);
      if (!moduleId && moduleOptions.length > 0) {
        setModuleId(moduleOptions[0].id);
      }
    }
  }, [type, moduleOptions, moduleId, questionToEdit]);

  useEffect(() => {
    if (selectedModule && !lessonId) {
      setLessonId(selectedModule.lessons?.[0]?.id || "");
    }
  }, [selectedModule, lessonId]);

  if (!type) return null;

  const isMcq = type === "MCQ";
  const isTrueFalse = type === "True / False";
  const questionType = QUESTION_TYPES[type];

  const handleAddOption = () => {
    if (type === "True / False") return;
    setOptions((prev) => [...prev, ""]);
  };

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((option, i) => (i === index ? value : option)));
  };

  const handleCorrectToggle = (index) => {
    if (type === "True / False") {
      setCorrectIndexes([index]);
      return;
    }
    setCorrectIndexes((prev) => (
      prev.includes(index) ? prev.filter((value) => value !== index) : [...prev, index]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!lessonId) {
      setError("Please select a lesson");
      return;
    }

    if (!question.trim()) {
      setError("Question text is required");
      return;
    }

    if (!questionOrder.trim()) {
      setError("Question order is required");
      return;
    }

    if ((isMcq || isTrueFalse) && options.some((option) => !option.trim())) {
      setError(`Please fill in all ${isTrueFalse ? "True / False" : "MCQ"} options`);
      return;
    }

    if ((isMcq || isTrueFalse) && correctIndexes.length === 0) {
      setError("Please mark at least one correct option");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const normalizedOptions = options.map((option) => option.trim()).filter(Boolean);
      const selectedCorrectAnswers = normalizedOptions.filter((_, index) => correctIndexes.includes(index));
      const derivedCorrectAnswer = isMcq
        ? selectedCorrectAnswers.join(" | ")
        : isTrueFalse
          ? normalizedOptions[correctIndexes[0]] || "True"
          : correctAnswer.trim();

      const questionPayload = {
        question_type: questionType,
        question: question.trim(),
        question_order: Number(questionOrder),
        correct_answer: derivedCorrectAnswer || undefined,
        audio_url: audioUrl.trim() || undefined,
        image_url: imageUrl.trim() || undefined
      };

      const response = questionToEdit
        ? await updateQuestion(questionToEdit.id, questionPayload)
        : await createQuestion(lessonId, questionPayload);
      const createdQuestion = response.data;

      if ((isMcq || isTrueFalse) && !questionToEdit) {
        for (const [index, optionText] of normalizedOptions.entries()) {
          await createQuestionOption(createdQuestion.id, {
            option_text: optionText.trim(),
            is_correct: correctIndexes.includes(index)
          });
        }
      }

      onCreated?.();
      onClose();
    } catch (submitError) {
      setError(submitError.message || "Failed to save question");
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
        className="scrollbar-hidden w-[calc(100vw-0.75rem)] max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-[0_28px_80px_rgba(124,92,255,0.18)] sm:w-full sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[#b9a7d5] sm:text-xs sm:tracking-[0.3em]">Add question</p>
            <h3 className="mt-2 text-xl font-semibold text-[#2a1840] sm:text-2xl">
              {questionToEdit ? `Edit ${type}` : type}
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
          <div className="rounded-2xl border border-[#f0f0f0] bg-white/95 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">Placement</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-[#5c4c72]">
                Module
                <select
                  value={moduleId}
                  onChange={(event) => {
                    setModuleId(event.target.value);
                    const nextModule = moduleOptions.find((module) => module.id === event.target.value);
                    setLessonId(nextModule?.lessons?.[0]?.id || "");
                  }}
                  className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
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
                Lesson
                <select
                  value={lessonId}
                  onChange={(event) => setLessonId(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                >
                  <option value="">Select lesson</option>
                  {lessonOptions.map((lesson) => (
                    <option key={lesson.id} value={lesson.id}>
                      {lesson.lessonOrder}. {lesson.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-[#5c4c72]">
                Order in lesson
                <input
                  value={questionOrder}
                  onChange={(event) => setQuestionOrder(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                  placeholder="1"
                  type="number"
                  min="1"
                />
              </label>
            </div>
          </div>

          <label className="block text-sm font-medium text-[#5c4c72]">
            Question title
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
              placeholder="Enter the question prompt"
            />
          </label>

          {isMcq || isTrueFalse ? (
            <div className="rounded-2xl border border-[#f0f0f0] bg-white/95 p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-[#b9a7d5]">
                  {isTrueFalse ? "True / False options" : "Options"}
                </p>
                {!isTrueFalse ? (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="rounded-lg border border-[#e7ddff] px-2.5 py-1 text-xs font-semibold text-[#67577f] transition hover:border-[#7c5cff] hover:bg-[#f7f2ff] hover:text-[#2a1840]"
                  >
                    Add Option
                  </button>
                ) : null}
              </div>
              <div className="mt-3 space-y-3">
                {options.map((option, index) => (
                  <div key={`option-${index}`} className="flex flex-col gap-2 md:flex-row md:items-center">
                    <input
                      className="w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                      placeholder={isTrueFalse ? (index === 0 ? "True" : "False") : `Option ${index + 1}`}
                      value={option}
                      onChange={(event) => handleOptionChange(index, event.target.value)}
                      readOnly={isTrueFalse}
                    />
                    <label className="flex items-center gap-2 text-xs font-semibold text-[#67577f]">
                      <input
                        type="checkbox"
                        checked={correctIndexes.includes(index)}
                        onChange={() => handleCorrectToggle(index)}
                      />
                      Correct
                    </label>
                  </div>
                ))}
              </div>
              {isTrueFalse ? (
                <p className="mt-3 text-xs text-[#7d6b96]">Choose either True or False as the correct option.</p>
              ) : null}
            </div>
          ) : null}

          {questionType === "single_choice" || questionType === "fill_in_blank" ? (
            <label className="block text-sm font-medium text-[#5c4c72]">
              Correct answer
              <input
                value={correctAnswer}
                onChange={(event) => setCorrectAnswer(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                placeholder="Enter correct answer"
              />
            </label>
          ) : null}

          {questionType === "speak_to_text" ? (
            <label className="block text-sm font-medium text-[#5c4c72]">
              Expected sentence
              <input
                value={correctAnswer}
                onChange={(event) => setCorrectAnswer(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                placeholder="What should the learner say?"
              />
            </label>
          ) : null}

          {questionType === "text_to_speech" ? (
            <label className="block text-sm font-medium text-[#5c4c72]">
              Audio URL
              <input
                value={audioUrl}
                onChange={(event) => setAudioUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                placeholder="https://..."
              />
            </label>
          ) : null}

          {(questionType === "text_to_speech" || questionType === "speak_to_text") && (
            <label className="block text-sm font-medium text-[#5c4c72]">
              Image URL
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className="mt-2 w-full rounded-xl border border-[#e7ddff] px-3 py-2 text-[#2a1840] focus:outline-none focus:border-[#7c5cff] focus:ring-1 focus:ring-[#7c5cff]"
                placeholder="https://..."
              />
            </label>
          )}

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
              {isSaving ? "Saving..." : questionToEdit ? "Update question" : "Save question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default QuestionTypeModal;
