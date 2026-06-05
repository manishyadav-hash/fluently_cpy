import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import {
  serializeChatMessages,
  serializeChatSuggestion,
  serializeConversation,
  serializeSendMessageResult,
} from "../serializers/chat.serializer";
import { ChatService, type ChatServiceContract } from "../services/chat.service";
import { decodeCursor } from "../utils/cursor-pagination";
import { sendPaginatedSuccess, sendSuccess } from "../utils/response";

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseLimit(value: unknown) {
  if (value === undefined) {
    return 20;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new AppError("limit must be between 1 and 100", 400, ErrorCodes.VALIDATION_ERROR, {
      field_errors: {
        limit: ["limit must be between 1 and 100"],
      },
      form_errors: [],
    });
  }

  return parsed;
}

function formatSseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export class ChatController {
  constructor(private readonly chatService: ChatServiceContract = new ChatService()) {}

  getSuggestions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const suggestions = await this.chatService.getSuggestions(req.user!.id);
      sendSuccess(res, suggestions.map(serializeChatSuggestion));
    } catch (error) {
      next(error);
    }
  };

  getOrCreateConversation = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.chatService.getOrCreateConversation(req.user!.id);
      sendSuccess(res, serializeConversation(result.conversation), result.created ? 201 : 200);
    } catch (error) {
      next(error);
    }
  };

  getConversationMessages = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = getParam(req.params.conversation_id);
      if (!conversationId) {
        throw new AppError("Conversation does not exist.", 404, ErrorCodes.CONVERSATION_NOT_FOUND);
      }

      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      if (cursor) {
        decodeCursor(cursor);
      }

      const result = await this.chatService.getConversationMessages(req.user!.id, conversationId, {
        cursor,
        limit: parseLimit(req.query.limit),
      });
      sendPaginatedSuccess(
        res,
        serializeChatMessages(result.messages),
        {
          has_more: result.pagination.hasMore,
          next_cursor: result.pagination.nextCursor,
        },
      );
    } catch (error) {
      next(error);
    }
  };

  sendMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = getParam(req.params.conversation_id);
      if (!conversationId) {
        throw new AppError("Conversation does not exist.", 404, ErrorCodes.CONVERSATION_NOT_FOUND);
      }

      const result = await this.chatService.sendMessage(req.user!.id, conversationId, req.body.content);
      sendSuccess(res, serializeSendMessageResult(result), 201);
    } catch (error) {
      next(error);
    }
  };

  streamMessage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = getParam(req.params.conversation_id);
      if (!conversationId) {
        throw new AppError("Conversation does not exist.", 404, ErrorCodes.CONVERSATION_NOT_FOUND);
      }

      const session = await this.chatService.startMessageStream(req.user!.id, conversationId, req.body.content);
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(formatSseEvent("message_start", {
        user_message_id: session.userMessageId,
        tutor_message_id: session.tutorMessageId,
      }));

      let fullContent = "";

      try {
        for await (const chunk of session.chunks) {
          fullContent += chunk;
          res.write(formatSseEvent("delta", { text: chunk }));
        }

        const completion = await session.complete(fullContent);
        res.write(formatSseEvent("message_end", {
          tutor_message_id: session.tutorMessageId,
          finish_reason: completion.finishReason,
        }));
      } catch (error) {
        try {
          await session.fail(fullContent, error);
        } catch {
          // Best effort: the stream should still terminate cleanly.
        }

        res.write(formatSseEvent("error", {
          message: "Failed to generate tutor response",
        }));
      }

      res.end();
    } catch (error) {
      next(error);
    }
  };
}
