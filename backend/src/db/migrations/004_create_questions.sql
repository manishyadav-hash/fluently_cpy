CREATE TABLE IF NOT EXISTS questions (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
   question_type VARCHAR(100) NOT NULL,
   question TEXT NOT NULL,
   audio_url TEXT,
   image_url TEXT,
   correct_answer TEXT,
   question_order INT NOT NULL,
   created_at TIMESTAMP DEFAULT NOW(),
   CONSTRAINT unique_question_order_per_lesson UNIQUE (lesson_id, question_order),
   CONSTRAINT valid_question_type CHECK (
      question_type IN (
         'mcq',
         'single_choice',
         'speak_to_text',
         'text_to_speech',
         'fill_in_blank'
      )
   )
);
