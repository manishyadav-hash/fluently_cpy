import { Router, type RequestHandler } from "express";
import { LearningController } from "../controllers/learning.controller";
import { authenticate } from "../middleware/auth";
import { uploadLessonAudio } from "../middleware/upload";
import { validate } from "../middleware/validate";
import type { LearningServiceContract } from "../services/learning.service";
import { submitLessonAudioSchema } from "../validations/learning.validation";

interface LearningRouterOptions {
  authenticateMiddleware?: RequestHandler;
  learningService?: LearningServiceContract;
  uploadLessonAudioMiddleware?: RequestHandler;
}

export function createLearningRouter(options: LearningRouterOptions = {}) {
  const router = Router();
  const controller = new LearningController(options.learningService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;
  const uploadLessonAudioMiddleware = options.uploadLessonAudioMiddleware ?? uploadLessonAudio;

  router.get("/users/me/dashboard", authenticateMiddleware, controller.getDashboard);
  router.get("/modules", authenticateMiddleware, controller.listModules);
  router.get("/lessons/:lesson_id", authenticateMiddleware, controller.getLessonDetails);
  router.post(
    "/lessons/:lesson_id/audio",
    authenticateMiddleware,
    uploadLessonAudioMiddleware,
    validate(submitLessonAudioSchema),
    controller.submitLessonAudio,
  );
  router.post("/lessons/:lesson_id/complete", authenticateMiddleware, controller.completeLesson);
  router.get("/users/me/stats", authenticateMiddleware, controller.getUserStats);

  return router;
}

export const learningRouter = createLearningRouter();
