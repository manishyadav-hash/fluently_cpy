import { Request, Response, NextFunction } from "express";
import { UserService } from "../services/user.service";
import { formatUserResponse, sendSuccess } from "../utils/response";
import { AppError } from "../errors/app-error";

const userService = new UserService();

export class UserController {
  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      sendSuccess(res, formatUserResponse(user));
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, formatUserResponse(user));
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError("No file provided", 400, "INVALID_FILE_TYPE");
      }
      const avatarUrl = await userService.uploadAvatar(req.user!.id, req.file);
      sendSuccess(res, { avatar_url: avatarUrl });
    } catch (error) {
      next(error);
    }
  };

  deleteAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userService.deleteAvatar(req.user!.id);
      sendSuccess(res, { avatar_url: null });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await userService.deleteAccount(req.user!.id);
      sendSuccess(res, { message: "Account deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
