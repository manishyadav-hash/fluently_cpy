import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { updateProfileSchema, updateProfileValidation } from "../validations/user.validation";
import { uploadAvatar } from "../middleware/upload";

export const userRouter = Router();

const userController = new UserController();

// All user routes require authentication
userRouter.use(authenticate);

userRouter.get("/me", userController.getProfile);
userRouter.patch("/me", validate(updateProfileSchema, updateProfileValidation), userController.updateProfile);
userRouter.delete("/me", userController.deleteAccount);
userRouter.post("/me/avatar", uploadAvatar, userController.uploadAvatar);
userRouter.delete("/me/avatar", userController.deleteAvatar);
