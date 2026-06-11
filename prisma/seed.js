require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL
  })
});

async function main() {
  await prisma.module.deleteMany();

  const course = await prisma.course.create({
    data: {
      title: 'Fluently Starter Course',
      description: 'Auto-created course to hold seeded modules.',
      level: 'beginner',
      audience: 'general_learner',
      durationWeeks: 5,
      status: 'published'
    }
  });

  const modules = [
    {
      title: 'Greetings and Introductions',
      description: 'Learn how to greet people and introduce yourself.',
      weekNo: 1,
      lessons: [
        {
          title: 'Simple Greetings',
          lessonLevel: 'beginner',
          lessonType: 'speaking',
          duration: '10 min',
          lessonOrder: 1,
          questions: [
            {
              questionType: 'mcq',
              question: 'Which is the best greeting in the morning?',
              correctAnswer: 'Good morning',
              questionOrder: 1,
              options: ['Good morning', 'Good night', 'See you later'],
              correctIndex: 0
            },
            {
              questionType: 'single_choice',
              question: 'Choose the polite introduction.',
              correctAnswer: 'My name is Sara.',
              questionOrder: 2,
              options: ['My name is Sara.', 'I am work Sara.'],
              correctIndex: 0
            }
          ]
        }
      ]
    },
    {
      title: 'Daily Routines',
      description: 'Talk about your day with confidence.',
      weekNo: 2,
      lessons: [
        {
          title: 'Morning Routine',
          lessonLevel: 'beginner',
          lessonType: 'audio',
          duration: '12 min',
          lessonOrder: 1,
          questions: [
            {
              questionType: 'fill_in_blank',
              question: 'I wake up _____ 7 AM.',
              correctAnswer: 'at',
              questionOrder: 1
            },
            {
              questionType: 'mcq',
              question: 'Which sentence is correct?',
              correctAnswer: 'I brush my teeth every morning.',
              questionOrder: 2,
              options: ['I brushing teeth morning.', 'I brush my teeth every morning.', 'I teeth brush daily.'],
              correctIndex: 1
            }
          ]
        }
      ]
    },
    {
      title: 'At Work',
      description: 'Practice professional communication.',
      weekNo: 3,
      lessons: [
        {
          title: 'Office Requests',
          lessonLevel: 'intermediate',
          lessonType: 'writing',
          duration: '15 min',
          lessonOrder: 1,
          questions: [
            {
              questionType: 'text_to_speech',
              question: 'Read this request clearly.',
              correctAnswer: 'Could you please send the report by noon?',
              questionOrder: 1
            },
            {
              questionType: 'single_choice',
              question: 'Choose the most professional reply.',
              correctAnswer: 'I will share the update by 5 PM.',
              questionOrder: 2,
              options: ['I will share the update by 5 PM.', 'Maybe later.'],
              correctIndex: 0
            }
          ]
        }
      ]
    },
    {
      title: 'Speaking in Situations',
      description: 'Handle real-life conversations smoothly.',
      weekNo: 4,
      lessons: [
        {
          title: 'At the Shop',
          lessonLevel: 'intermediate',
          lessonType: 'mixed',
          duration: '14 min',
          lessonOrder: 1,
          questions: [
            {
              questionType: 'speak_to_text',
              question: 'Say a line asking for help.',
              correctAnswer: 'Excuse me, could you help me?',
              questionOrder: 1
            },
            {
              questionType: 'mcq',
              question: 'What should you say if you do not understand?',
              correctAnswer: 'Could you repeat that, please?',
              questionOrder: 2,
              options: ['Could you repeat that, please?', 'I am know.', 'Repeat now.'],
              correctIndex: 0
            }
          ]
        }
      ]
    },
    {
      title: 'Final Review',
      description: 'Review everything and practice with confidence.',
      weekNo: 5,
      lessons: [
        {
          title: 'Checkpoint Practice',
          lessonLevel: 'advanced',
          lessonType: 'mixed',
          duration: '18 min',
          lessonOrder: 1,
          questions: [
            {
              questionType: 'fill_in_blank',
              question: 'I am available _____ 2 PM.',
              correctAnswer: 'after',
              questionOrder: 1
            },
            {
              questionType: 'mcq',
              question: 'Which sentence sounds natural?',
              correctAnswer: 'I will call you later.',
              questionOrder: 2,
              options: ['I call you later will.', 'I will call you later.', 'Later I you call.'],
              correctIndex: 1
            }
          ]
        }
      ]
    }
  ];

  for (const moduleData of modules) {
    await prisma.module.create({
      data: {
        title: moduleData.title,
        description: moduleData.description,
        weekNo: moduleData.weekNo,
        courseId: course.id,
        lessons: {
          create: moduleData.lessons.map((lesson) => ({
            title: lesson.title,
            lessonLevel: lesson.lessonLevel,
            lessonType: lesson.lessonType,
            duration: lesson.duration,
            lessonOrder: lesson.lessonOrder,
            questions: {
              create: lesson.questions.map((question) => ({
                questionType: question.questionType,
                question: question.question,
                correctAnswer: question.correctAnswer,
                questionOrder: question.questionOrder,
                options: question.options
                  ? {
                      create: question.options.map((optionText, index) => ({
                        optionText,
                        isCorrect: index === question.correctIndex
                      }))
                    }
                  : undefined
              }))
            }
          }))
        }
      }
    });
  }

  console.log(`Seeded course: ${course.title}`);
  console.log(`Seeded modules: ${modules.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
