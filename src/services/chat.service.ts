import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import {
  ChatRepository,
  type ChatConversationRecord,
  type ChatMessageRecord,
} from "../repositories/chat.repository";
import { decodeCursor, encodeCursor } from "../utils/cursor-pagination";
import {
  PlaceholderChatTutorService,
  type ChatTutorServiceContract,
} from "./chat-tutor.service";

const DEFAULT_CHAT_SUGGESTIONS = [
  { id: "sug_grammar", label: "Grammar Help", prompt: "Help me with English grammar" },
  { id: "sug_speaking", label: "Speaking Practice", prompt: "Let's practice speaking English" },
  { id: "sug_vocabulary", label: "Vocabulary", prompt: "Help me expand my English vocabulary" },
];

interface ChatRepositoryPort {
  countRecentUserMessages(userId: string, since: Date): Promise<number>;
  createConversation(userId: string): Promise<ChatConversationRecord>;
  createMessage(data: {
    content: string;
    conversationId: string;
    role: "user" | "tutor";
  }): Promise<ChatMessageRecord>;
  findConversationByIdForUser(conversationId: string, userId: string): Promise<ChatConversationRecord | null>;
  findLatestConversationByUserId(userId: string): Promise<ChatConversationRecord | null>;
  listMessagesForConversation(
    conversationId: string,
    options: {
      cursor?: {
        createdAt: Date;
        id: string;
      };
      limit: number;
    },
  ): Promise<ChatMessageRecord[]>;
  updateConversationAfterMessages(
    conversationId: string,
    incrementBy: number,
    lastMessageAt: Date,
  ): Promise<ChatConversationRecord>;
  updateMessageContent(messageId: string, content: string): Promise<ChatMessageRecord>;
}

interface ChatServiceDependencies {
  createChatRepository?: (db?: DatabaseClient) => ChatRepositoryPort;
  now?: () => Date;
  runInTransaction?: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
  tutorService?: ChatTutorServiceContract;
}

export interface ChatStreamSession {
  chunks: AsyncIterable<string>;
  complete(fullContent: string): Promise<{ finishReason: "complete" }>;
  fail(partialContent: string, error?: unknown): Promise<void>;
  tutorMessageId: string;
  userMessageId: string;
}

export interface ChatServiceContract {
  getConversationMessages(
    userId: string,
    conversationId: string,
    params: {
      cursor?: string;
      limit?: number;
    },
  ): Promise<{
    messages: ChatMessageRecord[];
    pagination: {
      hasMore: boolean;
      nextCursor: string | null;
    };
  }>;
  getOrCreateConversation(userId: string): Promise<{
    conversation: ChatConversationRecord;
    created: boolean;
  }>;
  getSuggestions(userId: string): Promise<Array<{ id: string; label: string; prompt: string }>>;
  sendMessage(
    userId: string,
    conversationId: string,
    content: string,
  ): Promise<{
    tutorMessage: ChatMessageRecord;
    userMessage: ChatMessageRecord;
  }>;
  startMessageStream(userId: string, conversationId: string, content: string): Promise<ChatStreamSession>;
}

export class ChatService implements ChatServiceContract {
  private readonly createChatRepository: (db?: DatabaseClient) => ChatRepositoryPort;
  private readonly now: () => Date;
  private readonly runInTransaction: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
  private readonly tutorService: ChatTutorServiceContract;

  constructor(dependencies: ChatServiceDependencies = {}) {
    this.createChatRepository = dependencies.createChatRepository ?? (db => new ChatRepository(db));
    this.now = dependencies.now ?? (() => new Date());
    this.runInTransaction = dependencies.runInTransaction ?? (callback => prisma.$transaction(tx => callback(tx)));
    this.tutorService = dependencies.tutorService ?? new PlaceholderChatTutorService();
  }

  async getSuggestions(_userId: string) {
    return DEFAULT_CHAT_SUGGESTIONS;
  }

  async getOrCreateConversation(userId: string) {
    const repository = this.createChatRepository();
    const existingConversation = await repository.findLatestConversationByUserId(userId);
    if (existingConversation) {
      return {
        conversation: existingConversation,
        created: false,
      };
    }

    const conversation = await repository.createConversation(userId);
    return {
      conversation,
      created: true,
    };
  }

  async getConversationMessages(
    userId: string,
    conversationId: string,
    params: {
      cursor?: string;
      limit?: number;
    },
  ) {
    const repository = this.createChatRepository();
    await this.requireConversation(userId, conversationId, repository);
    const limit = params.limit ?? 20;
    const decodedCursor = params.cursor ? decodeCursor(params.cursor) : null;
    const records = await repository.listMessagesForConversation(conversationId, {
      limit: limit + 1,
      ...(decodedCursor ? {
        cursor: {
          createdAt: new Date(decodedCursor.created_at),
          id: decodedCursor.id,
        },
      } : {}),
    });
    const hasMore = records.length > limit;
    const page = hasMore ? records.slice(0, limit) : records;
    const nextCursor = hasMore
      ? encodeCursor({
        created_at: page[page.length - 1]!.createdAt.toISOString(),
        id: page[page.length - 1]!.id,
      })
      : null;

    return {
      messages: [...page].reverse(),
      pagination: {
        hasMore,
        nextCursor,
      },
    };
  }

  async sendMessage(userId: string, conversationId: string, content: string) {
    return this.runInTransaction(async db => {
      const repository = this.createChatRepository(db);
      await this.requireConversation(userId, conversationId, repository);
      await this.assertNotRateLimited(userId, repository);

      const userMessage = await repository.createMessage({
        conversationId,
        role: "user",
        content,
      });
      const tutorReply = await this.tutorService.generateReply({ content, userId });
      const tutorMessage = await repository.createMessage({
        conversationId,
        role: "tutor",
        content: tutorReply,
      });
      await repository.updateConversationAfterMessages(conversationId, 2, tutorMessage.createdAt);

      return {
        tutorMessage,
        userMessage,
      };
    });
  }

  async startMessageStream(userId: string, conversationId: string, content: string): Promise<ChatStreamSession> {
    const initialState = await this.runInTransaction(async db => {
      const repository = this.createChatRepository(db);
      await this.requireConversation(userId, conversationId, repository);
      await this.assertNotRateLimited(userId, repository);

      const userMessage = await repository.createMessage({
        conversationId,
        role: "user",
        content,
      });
      const tutorMessage = await repository.createMessage({
        conversationId,
        role: "tutor",
        content: "",
      });
      await repository.updateConversationAfterMessages(conversationId, 2, tutorMessage.createdAt);

      return {
        tutorMessage,
        userMessage,
      };
    });
    const repository = this.createChatRepository();

    return {
      chunks: this.tutorService.streamReply({ content, userId }),
      complete: async fullContent => {
        try {
          await repository.updateMessageContent(initialState.tutorMessage.id, fullContent);
        } catch (error) {
          console.error(`[chat] Failed to save tutor message ${initialState.tutorMessage.id}:`, error);
          throw error;
        }
        return { finishReason: "complete" as const };
      },
      fail: async partialContent => {
        try {
          await repository.updateMessageContent(initialState.tutorMessage.id, partialContent);
        } catch (error) {
          console.error(`[chat] Failed to save partial tutor message ${initialState.tutorMessage.id}:`, error);
        }
      },
      tutorMessageId: initialState.tutorMessage.id,
      userMessageId: initialState.userMessage.id,
    };
  }

  private async requireConversation(
    userId: string,
    conversationId: string,
    repository: ChatRepositoryPort,
  ) {
    const conversation = await repository.findConversationByIdForUser(conversationId, userId);
    if (!conversation) {
      throw new AppError("Conversation does not exist.", 404, ErrorCodes.CONVERSATION_NOT_FOUND);
    }

    return conversation;
  }

  private async assertNotRateLimited(userId: string, repository: ChatRepositoryPort) {
    const since = new Date(this.now().getTime() - env.CHAT_RATE_LIMIT_WINDOW_SECONDS * 1000);
    const recentMessageCount = await repository.countRecentUserMessages(userId, since);

    if (recentMessageCount >= env.CHAT_RATE_LIMIT_MAX_MESSAGES) {
      throw new AppError(
        "Too many chat messages. Wait before sending again.",
        429,
        ErrorCodes.CHAT_RATE_LIMITED,
        { retry_after: env.CHAT_RATE_LIMIT_WINDOW_SECONDS },
        { "Retry-After": String(env.CHAT_RATE_LIMIT_WINDOW_SECONDS) },
      );
    }
  }
}
