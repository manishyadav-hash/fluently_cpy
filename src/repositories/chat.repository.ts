import type { MessageRole } from "@prisma/client";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";

interface CursorInput {
  createdAt: Date;
  id: string;
}

export interface ChatConversationRecord {
  createdAt: Date;
  id: string;
  lastMessageAt: Date | null;
  messageCount: number;
  userId: string;
}

export interface ChatMessageRecord {
  content: string;
  conversationId: string;
  createdAt: Date;
  id: string;
  role: MessageRole;
}

export class ChatRepository {
  constructor(private readonly db: DatabaseClient = prisma) {}

  async findLatestConversationByUserId(userId: string): Promise<ChatConversationRecord | null> {
    return this.db.conversation.findFirst({
      where: { userId },
      orderBy: [
        { lastMessageAt: "desc" },
        { createdAt: "desc" },
      ],
    });
  }

  async createConversation(userId: string): Promise<ChatConversationRecord> {
    return this.db.conversation.create({
      data: { userId },
    });
  }

  async findConversationByIdForUser(conversationId: string, userId: string): Promise<ChatConversationRecord | null> {
    return this.db.conversation.findFirst({
      where: {
        id: conversationId,
        userId,
      },
    });
  }

  async listMessagesForConversation(
    conversationId: string,
    options: {
      cursor?: CursorInput;
      limit: number;
    },
  ): Promise<ChatMessageRecord[]> {
    return this.db.chatMessage.findMany({
      where: {
        conversationId,
        ...(options.cursor ? {
          OR: [
            { createdAt: { lt: options.cursor.createdAt } },
            {
              createdAt: options.cursor.createdAt,
              id: { lt: options.cursor.id },
            },
          ],
        } : {}),
      },
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: options.limit,
    });
  }

  async countRecentUserMessages(userId: string, since: Date): Promise<number> {
    return this.db.chatMessage.count({
      where: {
        role: "user",
        createdAt: {
          gte: since,
        },
        conversation: {
          userId,
        },
      },
    });
  }

  async createMessage(data: {
    content: string;
    conversationId: string;
    role: MessageRole;
  }): Promise<ChatMessageRecord> {
    return this.db.chatMessage.create({
      data,
    });
  }

  async updateMessageContent(messageId: string, content: string): Promise<ChatMessageRecord> {
    return this.db.chatMessage.update({
      where: { id: messageId },
      data: { content },
    });
  }

  async updateConversationAfterMessages(
    conversationId: string,
    incrementBy: number,
    lastMessageAt: Date,
  ): Promise<ChatConversationRecord> {
    return this.db.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt,
        messageCount: {
          increment: incrementBy,
        },
      },
    });
  }
}
