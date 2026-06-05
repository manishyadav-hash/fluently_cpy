import { Router, type RequestHandler } from "express";
import { UserController } from "../controllers/user.controller";
import { QuestionnaireController } from "../controllers/questionnaire.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import type { QuestionnaireServiceContract } from "../services/questionnaire.service";
import type { UserServiceContract } from "../services/user.service";
import { updateProfileSchema, updateProfileValidation } from "../validations/user.validation";
import { uploadAvatar } from "../middleware/upload";

interface UserRouterOptions {
  authenticateMiddleware?: RequestHandler;
  questionnaireService?: QuestionnaireServiceContract;
  uploadAvatarMiddleware?: RequestHandler;
  userService?: UserServiceContract;
}

export function createUserRouter(options: UserRouterOptions = {}) {
  const userRouter = Router();
  const userController = new UserController(options.userService);
  const questionnaireController = new QuestionnaireController(options.questionnaireService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;
  const uploadAvatarMiddleware = options.uploadAvatarMiddleware ?? uploadAvatar;

  userRouter.use(authenticateMiddleware);
  userRouter.get("/me", userController.getProfile);
  userRouter.patch("/me", validate(updateProfileSchema, updateProfileValidation), userController.updateProfile);
  userRouter.delete("/me", userController.deleteAccount);
  userRouter.post("/me/avatar", uploadAvatarMiddleware, userController.uploadAvatar);
  userRouter.delete("/me/avatar", userController.deleteAvatar);
  userRouter.get("/me/personalized-plan", questionnaireController.getPersonalizedPlan);

  return userRouter;
}

export const userRouter = createUserRouter();
