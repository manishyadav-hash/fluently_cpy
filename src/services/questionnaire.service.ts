import { QuestionnaireAnswers, LearningGoal, SpeakingChallenge, ThirtyDayGoal } from "@prisma/client";
import { env } from "../config/env";
import { QuestionnaireRepository } from "../repositories/questionnaire.repository";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import { UserRepository } from "../repositories/user.repository";

interface PersonalizedPlan {
  goal_label: string;
  challenge_label: string;
  daily_practice_minutes: number;
  milestones: { week: number; label: string }[];
  plan_features: string[];
  social_proof: string;
}

interface QuestionnaireRepositoryPort {
  create(data: {
    dailyPracticeMinutes: number;
    learningGoal: LearningGoal;
    speakingChallenge: SpeakingChallenge;
    thirtyDayGoal: ThirtyDayGoal;
    userId: string;
  }): Promise<QuestionnaireAnswers>;
  findByUserId(userId: string): Promise<QuestionnaireAnswers | null>;
}

interface UserRepositoryPort {
  create(data: { phone: string }): Promise<unknown>;
  findById(id: string): Promise<unknown>;
  findByPhone(phone: string): Promise<unknown>;
  markOnboarded(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  update(id: string, data: { avatarUrl?: string | null; email?: string; name?: string }): Promise<unknown>;
}

interface QuestionnaireServiceDependencies {
  createQuestionnaireRepository?: (db?: DatabaseClient) => QuestionnaireRepositoryPort;
  createUserRepository?: (db?: DatabaseClient) => UserRepositoryPort;
  runInTransaction?: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
}

export interface QuestionnaireServiceContract {
  getPersonalizedPlan(userId: string): Promise<PersonalizedPlan>;
  submitQuestionnaire(
    userId: string,
    data: {
      learning_goal: LearningGoal;
      speaking_challenge: SpeakingChallenge;
      thirty_day_goal: ThirtyDayGoal;
      daily_practice_minutes: number;
    },
  ): Promise<{ questionnaire_completed: boolean; personalized_plan: PersonalizedPlan }>;
}

const GOAL_LABELS: Record<LearningGoal, string> = {
  crack_interviews: "Crack interviews",
  speak_confidently: "Speak confidently",
  office_communication: "Office communication",
  daily_conversations: "Daily conversations",
};

const CHALLENGE_LABELS: Record<SpeakingChallenge, string> = {
  freeze_while_speaking: "Freeze while speaking",
  translate_in_mind: "Translate in mind first",
  words_dont_come: "Words don't come quickly",
  fear_mistakes: "Fear of making mistakes",
};

const GOAL_FEATURES: Record<LearningGoal, string> = {
  crack_interviews: "Mock interview practice sessions",
  speak_confidently: "Confidence-building conversation drills",
  office_communication: "Real-life office conversation practice",
  daily_conversations: "Everyday conversation scenarios",
};

const MILESTONES = [
  { week: 1, label: "Stop translating in mind" },
  { week: 2, label: "Speak without hesitation" },
  { week: 4, label: "Sound confident & natural" },
];

export class QuestionnaireService implements QuestionnaireServiceContract {
  private readonly createQuestionnaireRepository: (db?: DatabaseClient) => QuestionnaireRepositoryPort;
  private readonly createUserRepository: (db?: DatabaseClient) => UserRepositoryPort;
  private readonly runInTransaction: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;

  constructor(dependencies: QuestionnaireServiceDependencies = {}) {
    this.createQuestionnaireRepository = dependencies.createQuestionnaireRepository ?? (db => new QuestionnaireRepository(db));
    this.createUserRepository = dependencies.createUserRepository ?? (db => new UserRepository(db));
    this.runInTransaction = dependencies.runInTransaction ?? (callback => prisma.$transaction(tx => callback(tx)));
  }

  async submitQuestionnaire(
    userId: string,
    data: {
      learning_goal: LearningGoal;
      speaking_challenge: SpeakingChallenge;
      thirty_day_goal: ThirtyDayGoal;
      daily_practice_minutes: number;
    },
  ): Promise<{ questionnaire_completed: boolean; personalized_plan: PersonalizedPlan }> {
    return this.runInTransaction(async db => {
      const questionnaireRepository = this.createQuestionnaireRepository(db);
      const userRepository = this.createUserRepository(db);
      const existing = await questionnaireRepository.findByUserId(userId);
      if (existing) {
        throw new AppError("Questionnaire was already submitted", 409, ErrorCodes.ALREADY_COMPLETED);
      }

      const answers = await questionnaireRepository.create({
        userId,
        learningGoal: data.learning_goal,
        speakingChallenge: data.speaking_challenge,
        thirtyDayGoal: data.thirty_day_goal,
        dailyPracticeMinutes: data.daily_practice_minutes,
      });

      await userRepository.markOnboarded(userId);

      return {
        questionnaire_completed: true,
        personalized_plan: this.generatePersonalizedPlan(answers),
      };
    });
  }

  async getPersonalizedPlan(userId: string): Promise<PersonalizedPlan> {
    const answers = await this.createQuestionnaireRepository().findByUserId(userId);
    if (!answers) {
      throw new AppError("Questionnaire not yet completed", 404, ErrorCodes.PLAN_NOT_FOUND);
    }

    return this.generatePersonalizedPlan(answers);
  }

  private generatePersonalizedPlan(answers: QuestionnaireAnswers): PersonalizedPlan {
    const goal = answers.learningGoal;
    const challenge = answers.speakingChallenge;
    const minutes = answers.dailyPracticeMinutes;

    return {
      goal_label: GOAL_LABELS[goal],
      challenge_label: CHALLENGE_LABELS[challenge],
      daily_practice_minutes: minutes,
      milestones: MILESTONES,
      plan_features: [
        `Daily speaking practice (${minutes} mins)`,
        GOAL_FEATURES[goal],
        "Interview confidence training",
        "AI speaking partner",
        "Weekly progress tracking",
      ],
      social_proof: "92% learners improved confidence in 21 days",
    };
  }
}
