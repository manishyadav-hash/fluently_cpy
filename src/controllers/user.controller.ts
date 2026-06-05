import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { serializeUser } from "../serializers/user.serializer";
import { UserService, type UserServiceContract } from "../services/user.service";
import { sendSuccess } from "../utils/response";

export class UserController {
  constructor(private readonly userService: UserServiceContract = new UserService()) {}

  getProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user!;
      sendSuccess(res, serializeUser(user));
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await this.userService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, serializeUser(user));
    } catch (error) {
      next(error);
    }
  };

  uploadAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        throw new AppError("No file provided", 400, ErrorCodes.INVALID_FILE_TYPE);
      }
      const avatarUrl = await this.userService.uploadAvatar(req.user!.id, req.file);
      sendSuccess(res, { avatar_url: avatarUrl });
    } catch (error) {
      next(error);
    }
  };

  deleteAvatar = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.userService.deleteAvatar(req.user!.id);
      sendSuccess(res, { avatar_url: null });
    } catch (error) {
      next(error);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await this.userService.deleteAccount(req.user!.id);
      sendSuccess(res, { message: "Account deleted successfully" });
    } catch (error) {
      next(error);
    }
  };
}
