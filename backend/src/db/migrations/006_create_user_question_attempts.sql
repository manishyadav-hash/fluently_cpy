CREATE TABLE IF NOT EXISTS user_question_attempts (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   user_id UUID NOT NULL,
   question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
   selected_option_id UUID REFERENCES question_options(id),
   spoken_text TEXT,
   expected_text TEXT,
   accuracy_score NUMERIC(5,2),
   is_correct BOOLEAN,
   created_at TIMESTAMP DEFAULT NOW()
);
