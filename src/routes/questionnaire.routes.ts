import { Router, type RequestHandler } from "express";
import { QuestionnaireController } from "../controllers/questionnaire.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { QuestionnaireServiceContract } from "../services/questionnaire.service";
import { submitQuestionnaireSchema, submitQuestionnaireValidation } from "../validations/questionnaire.validation";

interface QuestionnaireRouterOptions {
  authenticateMiddleware?: RequestHandler;
  questionnaireService?: QuestionnaireServiceContract;
}

export function createQuestionnaireRouter(options: QuestionnaireRouterOptions = {}) {
  const questionnaireRouter = Router();
  const questionnaireController = new QuestionnaireController(options.questionnaireService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  questionnaireRouter.use(authenticateMiddleware);
  questionnaireRouter.post(
    "/questionnaire",
    validate(submitQuestionnaireSchema, submitQuestionnaireValidation),
    questionnaireController.submitQuestionnaire,
  );

  return questionnaireRouter;
}

export const questionnaireRouter = createQuestionnaireRouter();
