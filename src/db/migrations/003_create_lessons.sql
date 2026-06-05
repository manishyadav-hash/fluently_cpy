CREATE TABLE IF NOT EXISTS lessons (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
   title VARCHAR(255) NOT NULL,
   lesson_order INT NOT NULL,
   created_at TIMESTAMP DEFAULT NOW(),
   CONSTRAINT unique_lesson_order_per_module UNIQUE (module_id, lesson_order)
);
