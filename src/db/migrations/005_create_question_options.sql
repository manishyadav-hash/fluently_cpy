CREATE TABLE IF NOT EXISTS question_options (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
   option_text TEXT NOT NULL,
   is_correct BOOLEAN DEFAULT false,
   CONSTRAINT unique_option_text_per_question UNIQUE (question_id, option_text)
);
