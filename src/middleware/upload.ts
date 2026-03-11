import type { RequestHandler } from "express";
import multer from "multer";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";

const storage = multer.memoryStorage();

interface UploadMiddlewareOptions {
  allowedMimeTypes: string[];
  fileTooLargeMessage: string;
  invalidMimeCode: string;
  invalidMimeMessage: string;
  maxFileSize: number;
}

function createUploadMiddleware(options: UploadMiddlewareOptions): RequestHandler {
  const upload = multer({
    storage,
    limits: { fileSize: options.maxFileSize },
    fileFilter: (_req, file, cb) => {
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        cb(new AppError(options.invalidMimeMessage, 400, options.invalidMimeCode));
        return;
      }

      cb(null, true);
    },
  }).single("file");

  return (req, res, next) => {
    upload(req, res, error => {
      if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
        next(new AppError(options.fileTooLargeMessage, 413, ErrorCodes.FILE_TOO_LARGE));
        return;
      }

      next(error as Error | undefined);
    });
  };
}

export const uploadAvatar = createUploadMiddleware({
  allowedMimeTypes: ["image/jpeg", "image/png"],
  fileTooLargeMessage: "File exceeds 5 MB limit",
  invalidMimeCode: ErrorCodes.INVALID_FILE_TYPE,
  invalidMimeMessage: "Only JPEG and PNG are accepted",
  maxFileSize: 5 * 1024 * 1024,
});

export const uploadLessonAudio = createUploadMiddleware({
  allowedMimeTypes: ["audio/wav", "audio/x-wav", "audio/wave", "audio/mpeg", "audio/mp3", "audio/mp4", "audio/x-m4a"],
  fileTooLargeMessage: "Audio file exceeds 25 MB limit",
  invalidMimeCode: ErrorCodes.INVALID_AUDIO_FORMAT,
  invalidMimeMessage: "Only WAV, M4A, and MP3 are accepted",
  maxFileSize: 25 * 1024 * 1024,
});
