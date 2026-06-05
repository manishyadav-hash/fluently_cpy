# Database Migrations

Run these SQL files in order to create the Fluently database schema.

```text
001_enable_pgcrypto.sql
002_create_modules.sql
003_create_lessons.sql
004_create_questions.sql
005_create_question_options.sql
006_create_user_question_attempts.sql
007_create_indexes.sql
```

These migrations keep the database setup inside the project so the schema is version-controlled and reproducible on another machine or server.
