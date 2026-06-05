import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { ChatServiceContract } from "../services/chat.service";
import { createTestClient } from "../test/support/test-client";
import { createChatRouter } from "./chat.routes";

function createUser(): User {
  const now = new Date("2026-03-01T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "chat-user@example.com",
    id: "usr_chat",
    isOnboarded: true,
    name: "Sachin Kumar",
    phone: "+919483898443",
    subscriptionStatus: "active",
    trialUsedAt: null,
    updatedAt: now,
  };
}

function createAuthMiddleware(): RequestHandler {
  return (req, _res, next) => {
    if (req.headers.authorization !== "Bearer phase-5") {
      next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    req.auth = {
      sessionId: "session_phase5",
      userId: "usr_chat",
    };
    req.user = createUser();
    next();
  };
}

async function* createChunkStream(chunks: string[]) {
  for (const chunk of chunks) {
    yield chunk;
  }
}

function createChatService(): ChatServiceContract {
  return {
    async getConversationMessages() {
      throw new Error("unused");
    },
    async getOrCreateConversation() {
      throw new Error("unused");
    },
    async getSuggestions() {
      throw new Error("unused");
    },
    async sendMessage() {
      throw new Error("unused");
    },
    async startMessageStream() {
      throw new Error("unused");
    },
  };
}

function createApp(chatService: ChatServiceContract) {
  const routerOptions = {
    authenticateMiddleware: createAuthMiddleware(),
    chatService,
  };
  const app = express();
  app.use(express.json());
  app.use("/v1/chat", createChatRouter(routerOptions));
  app.use("/api/chat", createChatRouter(routerOptions));
  app.use(errorHandler);
  return app;
}

describe("chat routes", () => {
  it("returns chat suggestions for GET /v1/chat/suggestions", async () => {
    const chatService = createChatService();
    chatService.getSuggestions = async userId => {
      assert.equal(userId, "usr_chat");
      return [
        { id: "sug_grammar", label: "Grammar Help", prompt: "Help me with English grammar" },
        { id: "sug_speaking", label: "Speaking Practice", prompt: "Let's practice speaking English" },
      ];
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/suggestions",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: Array<{ id: string; label: string }> }>();
    assert.equal(body.data[0]?.id, "sug_grammar");
    assert.equal(body.data[1]?.label, "Speaking Practice");
  });

  it("requires auth for GET /v1/chat/suggestions", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/suggestions",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("returns an existing conversation for POST /v1/chat/conversations", async () => {
    const chatService = createChatService();
    chatService.getOrCreateConversation = async userId => {
      assert.equal(userId, "usr_chat");
      return {
        conversation: {
          createdAt: new Date("2026-03-01T10:00:00.000Z"),
          id: "conv_existing",
          lastMessageAt: new Date("2026-03-01T10:05:00.000Z"),
          messageCount: 4,
          userId,
        },
        created: false,
      };
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations",
      headers: { authorization: "Bearer phase-5" },
      json: {},
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { id: string; message_count: number; user_id: string } }>();
    assert.equal(body.data.id, "conv_existing");
    assert.equal(body.data.user_id, "usr_chat");
    assert.equal(body.data.message_count, 4);
  });

  it("creates a new conversation for POST /v1/chat/conversations", async () => {
    const chatService = createChatService();
    chatService.getOrCreateConversation = async userId => ({
      conversation: {
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        id: "conv_new",
        lastMessageAt: null,
        messageCount: 0,
        userId,
      },
      created: true,
    });
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations",
      headers: { authorization: "Bearer phase-5" },
      json: {},
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.json<{ data: { id: string } }>().data.id, "conv_new");
  });

  it("returns paginated messages for GET /v1/chat/conversations/:conversation_id/messages", async () => {
    const chatService = createChatService();
    chatService.getConversationMessages = async (userId, conversationId, params) => {
      assert.equal(userId, "usr_chat");
      assert.equal(conversationId, "conv_xyz");
      assert.equal(params.limit, 20);
      assert.equal(params.cursor, undefined);
      return {
        messages: [
          {
            content: "Hello from your tutor",
            conversationId,
            createdAt: new Date("2026-03-01T10:02:00.000Z"),
            id: "msg_001",
            role: "tutor",
          },
        ],
        pagination: {
          hasMore: false,
          nextCursor: null,
        },
      };
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/conversations/conv_xyz/messages",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      data: Array<{ conversation_id: string; id: string }>;
      pagination: { has_more: boolean; next_cursor: string | null };
    }>();
    assert.equal(body.data[0]?.conversation_id, "conv_xyz");
    assert.equal(body.pagination.has_more, false);
    assert.equal(body.pagination.next_cursor, null);
  });

  it("accepts explicit cursor pagination params for GET /v1/chat/conversations/:conversation_id/messages", async () => {
    const chatService = createChatService();
    const cursor = Buffer.from(JSON.stringify({
      created_at: "2026-03-01T10:00:00.000Z",
      id: "msg_001",
    }), "utf8").toString("base64");
    chatService.getConversationMessages = async (_userId, _conversationId, params) => {
      assert.equal(params.limit, 10);
      assert.equal(params.cursor, cursor);
      return {
        messages: [],
        pagination: {
          hasMore: false,
          nextCursor: null,
        },
      };
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: `/v1/chat/conversations/conv_xyz/messages?limit=10&cursor=${encodeURIComponent(cursor)}`,
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 200);
  });

  it("validates message pagination limits", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/conversations/conv_xyz/messages?limit=101",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.VALIDATION_ERROR);
  });

  it("validates message pagination cursors", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/conversations/conv_xyz/messages?cursor=not-base64",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.VALIDATION_ERROR);
  });

  it("returns CONVERSATION_NOT_FOUND for unknown conversations", async () => {
    const chatService = createChatService();
    chatService.getConversationMessages = async () => {
      throw new AppError("Conversation does not exist.", 404, ErrorCodes.CONVERSATION_NOT_FOUND);
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/chat/conversations/conv_missing/messages",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.CONVERSATION_NOT_FOUND);
  });

  it("sends a chat message for POST /v1/chat/conversations/:conversation_id/messages", async () => {
    const chatService = createChatService();
    chatService.sendMessage = async (userId, conversationId, content) => {
      assert.equal(userId, "usr_chat");
      assert.equal(conversationId, "conv_xyz");
      assert.equal(content, "Can we practice travel phrases?");
      return {
        tutorMessage: {
          content: "Absolutely. Try saying: 'Where is the nearest Underground station?'",
          conversationId,
          createdAt: new Date("2026-03-01T10:03:05.000Z"),
          id: "msg_tutor",
          role: "tutor",
        },
        userMessage: {
          content,
          conversationId,
          createdAt: new Date("2026-03-01T10:03:00.000Z"),
          id: "msg_user",
          role: "user",
        },
      };
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/messages",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "Can we practice travel phrases?" },
    });

    assert.equal(response.statusCode, 201);
    const body = response.json<{ data: { tutor_message: { role: string }; user_message: { id: string } } }>();
    assert.equal(body.data.user_message.id, "msg_user");
    assert.equal(body.data.tutor_message.role, "tutor");
  });

  it("validates empty chat messages", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/messages",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "   " },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.EMPTY_MESSAGE);
  });

  it("validates long chat messages", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/messages",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "a".repeat(2001) },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.MESSAGE_TOO_LONG);
  });

  it("returns chat rate-limit metadata for POST /v1/chat/conversations/:conversation_id/messages", async () => {
    const chatService = createChatService();
    chatService.sendMessage = async () => {
      throw new AppError(
        "Too many chat messages. Wait before sending again.",
        429,
        ErrorCodes.CHAT_RATE_LIMITED,
        { retry_after: 30 },
        { "Retry-After": "30" },
      );
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/messages",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "Hello there" },
    });

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers["retry-after"], "30");
    const body = response.json<{ error: { code: string; details: { retry_after: number } } }>();
    assert.equal(body.error.code, ErrorCodes.CHAT_RATE_LIMITED);
    assert.equal(body.error.details.retry_after, 30);
  });

  it("streams tutor responses for POST /v1/chat/conversations/:conversation_id/stream", async () => {
    const chatService = createChatService();
    let completedWith = "";
    chatService.startMessageStream = async (userId, conversationId, content) => {
      assert.equal(userId, "usr_chat");
      assert.equal(conversationId, "conv_xyz");
      assert.equal(content, "Let's practice travel English");
      return {
        chunks: createChunkStream([
          "That's exciting! ",
          "London is beautiful. ",
          "Try saying: 'Where is the nearest Underground station?'",
        ]),
        async complete(fullContent) {
          completedWith = fullContent;
          return { finishReason: "complete" };
        },
        async fail() {
          throw new Error("unused");
        },
        tutorMessageId: "msg_003",
        userMessageId: "msg_002",
      };
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/stream",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "Let's practice travel English" },
    });

    assert.equal(response.statusCode, 200);
    assert.match(String(response.headers["content-type"]), /text\/event-stream/);
    assert.match(response.body, /event: message_start/);
    assert.match(response.body, /event: delta/);
    assert.match(response.body, /event: message_end/);
    assert.match(response.body, /"user_message_id":"msg_002"/);
    assert.match(response.body, /"finish_reason":"complete"/);
    assert.equal(completedWith, "That's exciting! London is beautiful. Try saying: 'Where is the nearest Underground station?'");
  });

  it("validates stream chat messages", async () => {
    const app = createApp(createChatService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/stream",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.EMPTY_MESSAGE);
  });

  it("keeps /api/chat/suggestions as a compatibility alias", async () => {
    const chatService = createChatService();
    chatService.getSuggestions = async () => [
      { id: "sug_1", label: "Grammar", prompt: "Help" },
    ];
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/api/chat/suggestions",
      headers: { authorization: "Bearer phase-5" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: Array<{ id: string }> }>().data[0]?.id, "sug_1");
  });

  it("returns chat rate-limit metadata for POST /v1/chat/conversations/:conversation_id/stream", async () => {
    const chatService = createChatService();
    chatService.startMessageStream = async () => {
      throw new AppError(
        "Too many chat messages. Wait before sending again.",
        429,
        ErrorCodes.CHAT_RATE_LIMITED,
        { retry_after: 30 },
        { "Retry-After": "30" },
      );
    };
    const app = createApp(chatService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "POST",
      path: "/v1/chat/conversations/conv_xyz/stream",
      headers: { authorization: "Bearer phase-5" },
      json: { content: "Hello there" },
    });

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers["retry-after"], "30");
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.CHAT_RATE_LIMITED);
  });
});
