import { User } from "@prisma/client";
import fs from "fs";
import path from "path";
import { UserRepository } from "../repositories/user.repository";
import { AppError } from "../errors/app-error";

export class UserService {
  private repo = new UserRepository();

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
        throw new AppError("Email already in use", 409, "EMAIL_CONFLICT");
      }
      throw error;
    }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase() ||
      (file.mimetype === "image/png" ? ".png" : ".jpg");
    const filename = `${userId}${ext}`;
    const uploadDir = path.join(__dirname, "../../public/uploads/avatars");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Remove old avatar files for this user (may have different extension)
    const existingFiles = fs.readdirSync(uploadDir).filter(f => f.startsWith(userId));
    for (const existing of existingFiles) {
      fs.unlinkSync(path.join(uploadDir, existing));
    }

    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    const avatarUrl = `/uploads/avatars/${filename}`;
    await this.repo.update(userId, { avatarUrl });
    return avatarUrl;
  }

  async deleteAvatar(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (user?.avatarUrl) {
      const filePath = path.join(__dirname, "../../public", user.avatarUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    await this.repo.update(userId, { avatarUrl: null });
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) throw new AppError("User not found", 404, "NOT_FOUND");

    await this.repo.softDelete(userId);
  }
}
