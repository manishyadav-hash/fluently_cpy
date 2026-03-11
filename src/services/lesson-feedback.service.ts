import type { LessonType } from "@prisma/client";

interface LessonFeedbackInput {
  durationSeconds: number;
  file: Express.Multer.File;
  lesson: {
    id: string;
    title: string;
    type: LessonType;
  };
}

interface LessonFeedbackResult {
  feedback: {
    fluencyScore: number;
    grammarScore: number;
    overallScore: number;
    pronunciationScore: number;
    suggestions: string[];
  };
  xpEarned: number;
}

export interface LessonFeedbackServiceContract {
  scoreLessonAudio(input: LessonFeedbackInput): Promise<LessonFeedbackResult>;
}

export class PlaceholderLessonFeedbackService implements LessonFeedbackServiceContract {
  async scoreLessonAudio(_input: LessonFeedbackInput): Promise<LessonFeedbackResult> {
    return {
      feedback: {
        pronunciationScore: 7.2,
        fluencyScore: 6.8,
        grammarScore: 8.1,
        overallScore: 7.4,
        suggestions: [
          "Try to slow down when pronouncing longer words.",
          "Good use of past tense verbs!",
        ],
      },
      xpEarned: 5,
    };
  }
}
