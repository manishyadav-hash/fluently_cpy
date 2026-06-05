CREATE TABLE IF NOT EXISTS modules (
   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
   title VARCHAR(255) NOT NULL,
   description TEXT,
   week_no INT UNIQUE NOT NULL,
   created_at TIMESTAMP DEFAULT NOW()
);
