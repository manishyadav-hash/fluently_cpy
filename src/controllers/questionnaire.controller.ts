import { Request, Response, NextFunction } from "express";
import { QuestionnaireService, type QuestionnaireServiceContract } from "../services/questionnaire.service";
import { sendSuccess } from "../utils/response";

export class QuestionnaireController {
  constructor(private readonly questionnaireService: QuestionnaireServiceContract = new QuestionnaireService()) {}

  submitQuestionnaire = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.questionnaireService.submitQuestionnaire(req.user!.id, req.body);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  };

  getPersonalizedPlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const plan = await this.questionnaireService.getPersonalizedPlan(req.user!.id);
      sendSuccess(res, plan);
    } catch (error) {
      next(error);
    }
  };
}
