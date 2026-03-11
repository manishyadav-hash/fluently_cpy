import { User } from "@prisma/client";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { LocalAvatarStorageService, type AvatarStorageContract } from "./avatar-storage.service";

interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  markOnboarded(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  update(id: string, data: { avatarUrl?: string | null; email?: string; name?: string }): Promise<User>;
}

interface UserServiceDependencies {
  avatarStorage?: AvatarStorageContract;
  userRepository?: UserRepositoryPort;
}

export interface UserServiceContract {
  deleteAccount(userId: string): Promise<void>;
  deleteAvatar(userId: string): Promise<void>;
  updateProfile(userId: string, data: { email?: string; name?: string }): Promise<User>;
  uploadAvatar(userId: string, file: Express.Multer.File): Promise<string>;
}

export class UserService implements UserServiceContract {
  private readonly avatarStorage: AvatarStorageContract;
  private readonly repo: UserRepositoryPort;

  constructor(dependencies: UserServiceDependencies = {}) {
    this.avatarStorage = dependencies.avatarStorage ?? new LocalAvatarStorageService();
    this.repo = dependencies.userRepository ?? new UserRepository();
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; email?: string }): Promise<User> {
    try {
      return await this.repo.update(userId, data);
    } catch (error: any) {
      if (error.code === "P2002" && error.meta?.target?.includes("email")) {
        throw new AppError("Email already in use", 409, ErrorCodes.EMAIL_CONFLICT);
      }
      throw error;
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const avatarUrl = await this.avatarStorage.saveAvatar(userId, file);
    await this.repo.update(userId, { avatarUrl });
    return avatarUrl;
  }

  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (user?.avatarUrl) {
      await this.avatarStorage.deleteAvatar(user.avatarUrl);
    }
    await this.repo.update(userId, { avatarUrl: null });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

    await this.repo.softDelete(userId);
  }
}
