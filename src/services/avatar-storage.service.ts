import fs from "node:fs";
import path from "node:path";

export interface AvatarStorageContract {
  deleteAvatar(avatarUrl: string): Promise<void>;
  saveAvatar(userId: string, file: Express.Multer.File): Promise<string>;
}

export class LocalAvatarStorageService implements AvatarStorageContract {
  async saveAvatar(userId: string, file: Express.Multer.File): Promise<string> {
    const ext = path.extname(file.originalname).toLowerCase() ||
      (file.mimetype === "image/png" ? ".png" : ".jpg");
    const filename = `${userId}${ext}`;
    const uploadDir = path.join(__dirname, "../../public/uploads/avatars");

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const existingFiles = fs.readdirSync(uploadDir).filter(entry => entry.startsWith(userId));
    for (const existingFile of existingFiles) {
      fs.unlinkSync(path.join(uploadDir, existingFile));
    }

    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    return `/uploads/avatars/${filename}?v=${Date.now()}`;
  }

  async deleteAvatar(avatarUrl: string): Promise<void> {
    if (!avatarUrl.startsWith("/uploads/avatars/")) {
      return;
    }

    const [relativePath] = avatarUrl.split("?");
    const filePath = path.join(__dirname, "../../public", relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}
