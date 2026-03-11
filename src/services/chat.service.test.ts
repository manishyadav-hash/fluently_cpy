import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { ChatService } from "./chat.service";

async function collectChunks(chunks: AsyncIterable<string>) {
  let output = "";

  for await (const chunk of chunks) {
    output += chunk;
  }

  return output;
}

describe("ChatService", () => {
  it("returns static suggestions", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() { return null; },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const suggestions = await service.getSuggestions("usr_chat");

    assert.equal(suggestions.length >= 3, true);
    assert.equal(suggestions[0]?.id, "sug_grammar");
  });

  it("returns the latest existing conversation instead of creating a new one", async () => {
    let createdConversation = false;
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() {
          createdConversation = true;
          throw new Error("unused");
        },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() { return null; },
        async findLatestConversationByUserId() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_existing",
            lastMessageAt: new Date("2026-03-01T10:05:00.000Z"),
            messageCount: 4,
            userId: "usr_chat",
          };
        },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getOrCreateConversation("usr_chat");

    assert.equal(result.created, false);
    assert.equal(result.conversation.id, "conv_existing");
    assert.equal(createdConversation, false);
  });

  it("creates a conversation when none exists", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation(userId) {
          assert.equal(userId, "usr_chat");
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_new",
            lastMessageAt: null,
            messageCount: 0,
            userId,
          };
        },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() { return null; },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getOrCreateConversation("usr_chat");

    assert.equal(result.created, true);
    assert.equal(result.conversation.id, "conv_new");
  });

  it("returns paginated messages with an opaque next cursor", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: new Date("2026-03-01T10:05:00.000Z"),
            messageCount: 4,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation(_conversationId, { limit }) {
          assert.equal(limit, 3);
          return [
            {
              content: "Newest",
              conversationId: "conv_xyz",
              createdAt: new Date("2026-03-01T10:03:00.000Z"),
              id: "msg_003",
              role: "tutor",
            },
            {
              content: "Middle",
              conversationId: "conv_xyz",
              createdAt: new Date("2026-03-01T10:02:00.000Z"),
              id: "msg_002",
              role: "user",
            },
            {
              content: "Oldest in page",
              conversationId: "conv_xyz",
              createdAt: new Date("2026-03-01T10:01:00.000Z"),
              id: "msg_001",
              role: "tutor",
            },
          ];
        },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    const result = await service.getConversationMessages("usr_chat", "conv_xyz", {
      cursor: undefined,
      limit: 2,
    });

    assert.equal(result.messages[0]?.id, "msg_002");
    assert.equal(result.messages[1]?.id, "msg_003");
    assert.equal(result.pagination.hasMore, true);
    assert.ok(result.pagination.nextCursor);
  });

  it("returns CONVERSATION_NOT_FOUND for missing conversations", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() { return null; },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.getConversationMessages("usr_chat", "conv_missing", { limit: 20 }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.CONVERSATION_NOT_FOUND);
        return true;
      },
    );
  });

  it("sends a user and tutor message transactionally", async () => {
    let updatedMessageCount = 0;
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage(data) {
          return {
            content: data.content,
            conversationId: data.conversationId,
            createdAt: data.role === "user"
              ? new Date("2026-03-01T10:03:00.000Z")
              : new Date("2026-03-01T10:03:05.000Z"),
            id: data.role === "user" ? "msg_user" : "msg_tutor",
            role: data.role,
          };
        },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: null,
            messageCount: 0,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages(_conversationId, incrementBy) {
          updatedMessageCount = incrementBy;
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: new Date("2026-03-01T10:03:05.000Z"),
            messageCount: 2,
            userId: "usr_chat",
          };
        },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      runInTransaction: async callback => callback({} as never),
      tutorService: {
        async generateReply() {
          return "That's exciting! Let's practice travel phrases.";
        },
        async *streamReply() {
          yield "unused";
        },
      },
    });

    const result = await service.sendMessage("usr_chat", "conv_xyz", "Can we practice travel?");

    assert.equal(result.userMessage.id, "msg_user");
    assert.equal(result.tutorMessage.id, "msg_tutor");
    assert.equal(updatedMessageCount, 2);
  });

  it("rate limits chat sends with retry metadata", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 10; },
        async createConversation() { throw new Error("unused"); },
        async createMessage() { throw new Error("unused"); },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: null,
            messageCount: 0,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() { throw new Error("unused"); },
        async updateMessageContent() { throw new Error("unused"); },
      }),
      now: () => new Date("2026-03-01T10:03:00.000Z"),
      runInTransaction: async callback => callback({} as never),
    });

    await assert.rejects(
      service.sendMessage("usr_chat", "conv_xyz", "Hello"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, ErrorCodes.CHAT_RATE_LIMITED);
        assert.equal(error.statusCode, 429);
        assert.deepEqual(error.details, { retry_after: 30 });
        assert.deepEqual(error.headers, { "Retry-After": "30" });
        return true;
      },
    );
  });

  it("starts a stream, yields deltas, and finalizes the tutor message", async () => {
    let finalizedContent = "";
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage(data) {
          return {
            content: data.content,
            conversationId: data.conversationId,
            createdAt: new Date("2026-03-01T10:03:00.000Z"),
            id: data.role === "user" ? "msg_user" : "msg_tutor",
            role: data.role,
          };
        },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: null,
            messageCount: 0,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: new Date("2026-03-01T10:03:05.000Z"),
            messageCount: 2,
            userId: "usr_chat",
          };
        },
        async updateMessageContent(_messageId, content) {
          finalizedContent = content;
          return {
            content,
            conversationId: "conv_xyz",
            createdAt: new Date("2026-03-01T10:03:05.000Z"),
            id: "msg_tutor",
            role: "tutor",
          };
        },
      }),
      runInTransaction: async callback => callback({} as never),
      tutorService: {
        async generateReply() {
          return "unused";
        },
        async *streamReply() {
          yield "That's exciting! ";
          yield "Let's practice travel phrases.";
        },
      },
    });

    const session = await service.startMessageStream("usr_chat", "conv_xyz", "Can we practice travel?");
    const streamed = await collectChunks(session.chunks);
    const completion = await session.complete(streamed);

    assert.equal(session.userMessageId, "msg_user");
    assert.equal(session.tutorMessageId, "msg_tutor");
    assert.equal(streamed, "That's exciting! Let's practice travel phrases.");
    assert.equal(finalizedContent, streamed);
    assert.equal(completion.finishReason, "complete");
  });

  it("stream complete() re-throws DB errors after logging", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage(data) {
          return {
            content: data.content,
            conversationId: data.conversationId,
            createdAt: new Date("2026-03-01T10:03:00.000Z"),
            id: data.role === "user" ? "msg_user" : "msg_tutor",
            role: data.role,
          };
        },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: null,
            messageCount: 0,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: new Date("2026-03-01T10:03:05.000Z"),
            messageCount: 2,
            userId: "usr_chat",
          };
        },
        async updateMessageContent() {
          throw new Error("DB write failed");
        },
      }),
      runInTransaction: async callback => callback({} as never),
      tutorService: {
        async generateReply() { return "unused"; },
        async *streamReply() { yield "Hello"; },
      },
    });

    const session = await service.startMessageStream("usr_chat", "conv_xyz", "Hi");
    await collectChunks(session.chunks);

    await assert.rejects(
      session.complete("Hello"),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal(error.message, "DB write failed");
        return true;
      },
    );
  });

  it("stream fail() swallows DB errors gracefully", async () => {
    const service = new ChatService({
      createChatRepository: () => ({
        async countRecentUserMessages() { return 0; },
        async createConversation() { throw new Error("unused"); },
        async createMessage(data) {
          return {
            content: data.content,
            conversationId: data.conversationId,
            createdAt: new Date("2026-03-01T10:03:00.000Z"),
            id: data.role === "user" ? "msg_user" : "msg_tutor",
            role: data.role,
          };
        },
        async findConversationByIdForUser() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: null,
            messageCount: 0,
            userId: "usr_chat",
          };
        },
        async findLatestConversationByUserId() { return null; },
        async listMessagesForConversation() { return []; },
        async updateConversationAfterMessages() {
          return {
            createdAt: new Date("2026-03-01T10:00:00.000Z"),
            id: "conv_xyz",
            lastMessageAt: new Date("2026-03-01T10:03:05.000Z"),
            messageCount: 2,
            userId: "usr_chat",
          };
        },
        async updateMessageContent() {
          throw new Error("DB write failed");
        },
      }),
      runInTransaction: async callback => callback({} as never),
      tutorService: {
        async generateReply() { return "unused"; },
        async *streamReply() { yield "partial"; },
      },
    });

    const session = await service.startMessageStream("usr_chat", "conv_xyz", "Hi");
    await collectChunks(session.chunks);

    // fail() should NOT throw even when the DB write fails
    await session.fail("partial");
  });
});
