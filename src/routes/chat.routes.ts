import { Router, type RequestHandler } from "express";
import { ChatController } from "../controllers/chat.controller";
import { authenticate } from "../middleware/auth";
import { validateChatMessageContent } from "../validations/chat.validation";
import type { ChatServiceContract } from "../services/chat.service";

interface ChatRouterOptions {
  authenticateMiddleware?: RequestHandler;
  chatService?: ChatServiceContract;
}

export function createChatRouter(options: ChatRouterOptions = {}) {
  const router = Router();
  const controller = new ChatController(options.chatService);
  const authenticateMiddleware = options.authenticateMiddleware ?? authenticate;

  router.use(authenticateMiddleware);
  router.get("/suggestions", controller.getSuggestions);
  router.post("/conversations", controller.getOrCreateConversation);
  router.get("/conversations/:conversation_id/messages", controller.getConversationMessages);
  router.post("/conversations/:conversation_id/messages", validateChatMessageContent, controller.sendMessage);
  router.post("/conversations/:conversation_id/stream", validateChatMessageContent, controller.streamMessage);

  return router;
}

export const chatRouter = createChatRouter();
