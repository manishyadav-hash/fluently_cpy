import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import {
  serializeDashboard,
  serializeLessonAudioSubmission,
  serializeLessonCompletion,
  serializeLessonDetail,
  serializeLearningStats,
  serializeModule,
} from "../serializers/learning.serializer";
import { LearningService, type LearningServiceContract } from "../services/learning.service";
import { sendSuccess } from "../utils/response";

function parseIncludeLessons(value: unknown) {
  if (value === undefined) {
    return true;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  throw new AppError("include_lessons must be true or false", 400, ErrorCodes.VALIDATION_ERROR, {
    field_errors: {
      include_lessons: ["include_lessons must be true or false"],
    },
    form_errors: [],
  });
}

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export class LearningController {
  constructor(private readonly learningService: LearningServiceContract = new LearningService()) {}

  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.learningService.getDashboard(req.user!.id);
      sendSuccess(res, serializeDashboard(result));
    } catch (error) {
      next(error);
    }
  };

  listModules = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const includeLessons = parseIncludeLessons(req.query.include_lessons);
      const result = await this.learningService.listModules(req.user!.id, includeLessons);
      sendSuccess(res, result.map(serializeModule));
    } catch (error) {
      next(error);
    }
  };

  getLessonDetails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = getRouteParam(req.params.lesson_id);
      if (!lessonId) {
        throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
      }

      const result = await this.learningService.getLessonDetails(req.user!.id, lessonId);
      sendSuccess(res, serializeLessonDetail(result));
    } catch (error) {
      next(error);
    }
  };

  submitLessonAudio = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = getRouteParam(req.params.lesson_id);
      if (!lessonId) {
        throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
      }

      if (!req.file) {
        throw new AppError("Only WAV, M4A, and MP3 are accepted", 400, ErrorCodes.INVALID_AUDIO_FORMAT);
      }

      const result = await this.learningService.submitLessonAudio(
        req.user!.id,
        lessonId,
        req.file,
        req.body.duration_seconds,
      );
      sendSuccess(res, serializeLessonAudioSubmission(result));
    } catch (error) {
      next(error);
    }
  };

  completeLesson = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const lessonId = getRouteParam(req.params.lesson_id);
      if (!lessonId) {
        throw new AppError("Lesson does not exist.", 404, ErrorCodes.LESSON_NOT_FOUND);
      }

      const result = await this.learningService.completeLesson(req.user!.id, lessonId);
      sendSuccess(res, serializeLessonCompletion(result));
    } catch (error) {
      next(error);
    }
  };

  getUserStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.learningService.getUserStats(req.user!.id);
      sendSuccess(res, serializeLearningStats(result));
    } catch (error) {
      next(error);
    }
  };
}
