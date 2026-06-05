import { QuestionnaireAnswers, LearningGoal, SpeakingChallenge, ThirtyDayGoal } from "@prisma/client";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

export class QuestionnaireRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async findByUserId(userId: string): Promise<QuestionnaireAnswers | null> {
    return this.db.questionnaireAnswers.findUnique({ where: { userId } });
  }

  async create(data: {
    userId: string;
    learningGoal: LearningGoal;
    speakingChallenge: SpeakingChallenge;
    thirtyDayGoal: ThirtyDayGoal;
    dailyPracticeMinutes: number;
  }): Promise<QuestionnaireAnswers> {
    return this.db.questionnaireAnswers.create({ data });
  }
}
