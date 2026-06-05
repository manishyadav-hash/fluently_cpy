# Fluently Admin Module Implementation

## Overview

This implementation builds the first backend foundation for the Fluently admin dashboard. The admin can create course modules, add lessons inside modules, add questions inside lessons, and add answer options for questions.

The structure follows a clean parent-child relationship similar to learning apps like Duolingo:

```text
Module
  -> Lesson
      -> Question
          -> Question Option
```

Each level depends on the previous level. This keeps the data organized and makes it easy for the frontend dashboard to display course content step by step.

## Backend Tech Stack

```text
Node.js
Express.js
PostgreSQL
pg package
dotenv
cors
```

The backend uses Express for API routing and PostgreSQL for storing structured course data.

## Folder Structure

```text
src/
  app.js
  server.js
  db/
    index.js
  controllers/
    Request body:

    ```json
    {
      "title": "Basics of Speaking",
      "description": "Learn basic spoken English",
      "week_no": 1
    }
    ```

    Purpose:

    ```text
    Creates a new module in the course structure.
    ```

    Validation:

    ```text
    title is required
    week_no is required
    duplicate week_no is handled
    ```

    Success response:

    ```json
    {
      "success": true,
      "message": "Module created successfully",
      "data": {
        ## Prisma ORM Detailed Implementation Documentation

        ## Fluently Learning Module Backend

        ## 1. Overview

        This project uses Prisma ORM with PostgreSQL to manage a structured learning backend for an admin dashboard. The admin can create:

        - modules
        - lessons inside modules
        - questions inside lessons
        - question options inside questions

        The data follows a parent-child hierarchy:

        ```text
        Module
          -> Lesson
              -> Question
                  -> QuestionOption
        ```

        Each level depends on the one above it, which makes the data easy to validate, query, and render in the frontend.

        ## 2. What Prisma ORM Does

        Prisma is an ORM for Node.js applications. It lets you work with a relational database using JavaScript objects and methods instead of writing raw SQL for every operation.

        In this project, Prisma handles:

        - schema definition
        - relationships
        - foreign keys
        - unique constraints
        - migrations
        - database queries through Prisma Client

        ## 3. Why Prisma Was Used Here

        This project has multiple related entities, so Prisma is a strong fit because it provides:

        - clean schema structure
        - type-safe queries
        - easier relationship handling
        - generated client methods
        - safer database changes through migrations
        - better long-term maintainability

        ## 4. Tech Stack

        ```text
        Node.js
        Express.js
        PostgreSQL
        Prisma ORM
        Prisma Client
        pg
        dotenv
        cors
        ```

        ## 5. Prisma Setup in This Project

        ### Installed packages

        ```bash
        npm install prisma --save-dev
        npm install @prisma/client
        npm install @prisma/adapter-pg pg
        ```

        ### Prisma initialization

        ```bash
        npx prisma init
        ```

        This creates:

        - `prisma/schema.prisma`
        - `.env`

        ### Database URL

        The database connection string is read from `DATABASE_URL`.

        ## 6. Prisma Configuration Files

        ### Schema file

        The main schema is in [prisma/schema.prisma](prisma/schema.prisma).

        ### Prisma config

        The project uses [prisma.config.ts](prisma.config.ts) to point Prisma to the schema, migration folder, and database URL.

        ### Prisma client setup

        The Prisma client is created in [src/db/prisma.js](src/db/prisma.js).

        That file uses:

        - `@prisma/client`
        - `@prisma/adapter-pg`

        ## 7. Schema Models

        The schema defines four models and one enum:

        - `Module`
        - `Lesson`
        - `Question`
        - `QuestionOption`
        - `QuestionType`

        ## 8. Current Prisma Schema

        ```prisma
        generator client {
          provider = "prisma-client-js"
        }

        datasource db {
          provider = "postgresql"
        }

        enum QuestionType {
          mcq
          single_choice
          speak_to_text
          text_to_speech
          fill_in_blank
        }

        model Module {
          id          String   @id @default(uuid()) @db.Uuid
          title       String
          description String?
          weekNo      Int      @unique @map("week_no")
          createdAt   DateTime @default(now()) @map("created_at")

          lessons Lesson[]

          @@map("modules")
        }

        model Lesson {
          id          String   @id @default(uuid()) @db.Uuid
          moduleId    String   @map("module_id") @db.Uuid
          title       String
          lessonOrder Int      @map("lesson_order")
          createdAt   DateTime @default(now()) @map("created_at")

          module    Module     @relation(fields: [moduleId], references: [id], onDelete: Cascade)
          questions Question[]

          @@unique([moduleId, lessonOrder])
          @@map("lessons")
        }

        model Question {
          id            String       @id @default(uuid()) @db.Uuid
          lessonId      String       @map("lesson_id") @db.Uuid
          questionType  QuestionType @map("question_type")
          question      String
          audioUrl      String?      @map("audio_url")
          imageUrl      String?      @map("image_url")
          correctAnswer String?      @map("correct_answer")
          questionOrder Int          @map("question_order")
          createdAt     DateTime     @default(now()) @map("created_at")

          lesson  Lesson           @relation(fields: [lessonId], references: [id], onDelete: Cascade)
          options QuestionOption[]

          @@unique([lessonId, questionOrder])
          @@map("questions")
        }

        model QuestionOption {
          id         String  @id @default(uuid()) @db.Uuid
          questionId String  @map("question_id") @db.Uuid
          optionText String  @map("option_text")
          isCorrect  Boolean @default(false) @map("is_correct")

          question Question @relation(fields: [questionId], references: [id], onDelete: Cascade)

          @@unique([questionId, optionText])
          @@map("question_options")
        }
        ```

        ## 9. Important Prisma Keywords

        ### `@id`

        Marks a field as the primary key.

        ### `@default(uuid())`

        Automatically generates a UUID for new rows.

        ### `@db.Uuid`

        Stores the field as a PostgreSQL UUID type.

        ### `@unique`

        Makes a field unique.

        ### `String?`

        Makes a field optional.

        ### `DateTime`

        Stores date and time values.

        ### `@default(now())`

        Automatically sets the current timestamp.

        ### `@map()`

        Maps a Prisma field name to a database column name.

        ### `@@map()`

        Maps a Prisma model name to a database table name.

        ### `@relation()`

        Defines a foreign-key relationship between models.

        ### `onDelete: Cascade`

        Deletes child records automatically when the parent record is deleted.

        ### `@@unique()`

        Creates a compound unique constraint.

        ### `enum`

        Restricts a field to predefined values only.

        ## 10. Relationship Flow

        ```text
        Module
          -> Lesson
              -> Question
                  -> QuestionOption
        ```

        Meaning:

        - one module has many lessons
        - one lesson has many questions
        - one question has many options

        ## 11. How Prisma Is Used in the Code

        ### Module controller

        The module controller uses Prisma to create and fetch modules.

        Example methods:

        - `prisma.module.create()`
        - `prisma.module.findMany()`

        ### Lesson controller

        The lesson controller creates lessons and fetches lessons by module.

        Example methods:

        - `prisma.lesson.create()`
        - `prisma.lesson.findMany()`

        ### Question controller

        The question controller creates questions and fetches questions by lesson.

        Example methods:

        - `prisma.question.create()`
        - `prisma.question.findMany()`

        ### Question option controller

        The question option controller creates options for a question.

        Example method:

        - `prisma.questionOption.create()`

        ## 12. API Routes in This Project

        ### Module routes

        - `POST /api/admin/modules`
        - `GET /api/admin/modules`

        ### Lesson routes

        - `POST /api/admin/modules/:moduleId/lessons`
        - `GET /api/admin/modules/:moduleId/lessons`

        ### Question routes

        - `POST /api/admin/lessons/:lessonId/questions`
        - `GET /api/admin/lessons/:lessonId/questions`

        ### Question option routes

        - `POST /api/admin/questions/:questionId/options`

        ## 13. Example Prisma Queries

        ### Create a module

        ```js
        const createdModule = await prisma.module.create({
          data: {
            title: 'English Basics',
            weekNo: 1
          }
        });
        ```

        ### Fetch modules with nested relations

        ```js
        const modules = await prisma.module.findMany({
          include: {
            lessons: {
              include: {
                questions: {
                  include: {
                    options: true
                  }
                }
              }
            }
          }
        });
        ```

        ## 14. Migration Commands

        ### Create and apply a migration

        ```bash
        npx prisma migrate dev --name init
        ```

        ### Generate Prisma Client

        ```bash
        npx prisma generate
        ```

        ### Open Prisma Studio

        ```bash
        npx prisma studio
        ```

        ### Pull an existing database into the schema

        ```bash
        npx prisma db pull
        ```

        ### Push schema changes without migration history

        ```bash
        npx prisma db push
        ```

        ## 15. What `migrate dev` Does

        When you run `npx prisma migrate dev --name init`, Prisma:

        - compares the schema to the database
        - generates SQL migration files
        - applies those changes to the database
        - updates migration history
        - regenerates the Prisma Client

        ## 16. Legacy SQL Migrations in This Repo

        This project also contains older manual SQL files under [src/db/migrations](src/db/migrations).

        Those files represent a separate SQL-based migration approach. The Prisma-based workflow is the one described in this document.

        ## 17. Why This Architecture Is Good

        - clean relational design
        - easier CRUD operations
        - safer schema changes
        - better maintainability
        - strong data consistency
        - simpler backend scaling

        ## 18. Conclusion

        This project uses Prisma ORM with PostgreSQL to manage a structured learning backend in a clean and maintainable way. Prisma simplifies schema design, relationships, queries, and migrations while keeping the codebase organized.

