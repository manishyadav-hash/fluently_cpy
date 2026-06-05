CREATE INDEX IF NOT EXISTS idx_lessons_module_id
ON lessons(module_id);

CREATE INDEX IF NOT EXISTS idx_questions_lesson_id
ON questions(lesson_id);

CREATE INDEX IF NOT EXISTS idx_options_question_id
ON question_options(question_id);

CREATE INDEX IF NOT EXISTS idx_attempts_user_id
ON user_question_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_attempts_question_id
ON user_question_attempts(question_id);
