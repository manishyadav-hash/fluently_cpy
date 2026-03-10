import multer from "multer";
import { AppError } from "../errors/app-error";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.memoryStorage();

export const uploadAvatar = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError("Only JPEG and PNG are accepted", 400, "INVALID_FILE_TYPE"));
    }
    cb(null, true);
  },
}).single("file");
