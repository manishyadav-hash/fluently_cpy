import { Request, Response, NextFunction } from "express";
import { serializeContentPage, serializeHelpSupport } from "../serializers/settings.serializer";
import { ContentService, type ContentServiceContract } from "../services/content.service";
import { sendSuccess } from "../utils/response";

export class ContentController {
  constructor(private readonly contentService: ContentServiceContract = new ContentService()) {}

  getPrivacyPolicy = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const page = await this.contentService.getPrivacyPolicy();
      sendSuccess(res, serializeContentPage(page));
    } catch (error) {
      next(error);
    }
  };

  getTermsAndConditions = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const page = await this.contentService.getTermsAndConditions();
      sendSuccess(res, serializeContentPage(page));
    } catch (error) {
      next(error);
    }
  };

  getRefundPolicy = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const page = await this.contentService.getRefundPolicy();
      sendSuccess(res, serializeContentPage(page));
    } catch (error) {
      next(error);
    }
  };

  getHelpSupport = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const page = await this.contentService.getHelpSupport();
      sendSuccess(res, serializeHelpSupport(page));
    } catch (error) {
      next(error);
    }
  };
}
