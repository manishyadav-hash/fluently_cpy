import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import type { User } from "@prisma/client";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "./error-handler";
import { createAuthenticate } from "./auth";
import { createTestClient } from "../test/support/test-client";
import { TokenService } from "../services/token.service";
import { sendSuccess } from "../utils/response";

const JWT_SECRET = "test-secret-for-auth-middleware";
const ACCESS_EXPIRES = 3600;
const REFRESH_EXPIRES = 86400;

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-03-01T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "test@example.com",
    id: "usr_auth",
    isOnboarded: true,
    name: "Auth Test",
    phone: "+919876543210",
    subscriptionStatus: "active",
    trialUsedAt: null,
    updatedAt: now,
    ...overrides,
  };
}

function createTokenService() {
  return new TokenService({
    jwtSecret: JWT_SECRET,
    accessTokenExpiresInSeconds: ACCESS_EXPIRES,
    refreshTokenExpiresInSeconds: REFRESH_EXPIRES,
  });
}

interface MockSession {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  revokedAt: Date | null;
  token: string;
  user: User;
  userId: string;
}

function createMockRefreshTokenRepository(sessions: Map<string, MockSession>) {
  return {
    async createSession(data: { expiresAt: Date; id: string; token: string; userId: string }) {
      const session: MockSession = {
        ...data,
        createdAt: new Date(),
        revokedAt: null,
        user: createUser({ id: data.userId }),
      };
      sessions.set(data.id, session);
      return session;
    },
    async findActiveSessionById(id: string) {
      const session = sessions.get(id);
      if (!session || session.revokedAt || session.expiresAt <= new Date()) {
        return null;
      }
      return session;
    },
    async revokeSession(id: string, revokedAt: Date) {
      const session = sessions.get(id);
      if (session) {
        session.revokedAt = revokedAt;
      }
    },
  };
}

function createMockUserRepository(users: Map<string, User>) {
  return {
    async findByPhone(phone: string) {
      for (const user of users.values()) {
        if (user.phone === phone) return user;
      }
      return null;
    },
  };
}

function createApp(options: {
  sessions: Map<string, MockSession>;
  users?: Map<string, User>;
}) {
  const tokenService = createTokenService();
  const refreshTokenRepo = createMockRefreshTokenRepository(options.sessions);
  const userRepo = createMockUserRepository(options.users ?? new Map());

  const authenticate = createAuthenticate({
    jwtSecret: JWT_SECRET,
    refreshTokenRepository: refreshTokenRepo as any,
    tokenService,
    userRepository: userRepo as any,
  });

  const app = express();
  app.use(express.json());
  app.get("/protected", authenticate, (req, res) => {
    sendSuccess(res, { userId: req.user!.id, sessionId: req.auth!.sessionId });
  });
  app.use(errorHandler);
  return { app, tokenService, refreshTokenRepo };
}

describe("auth middleware", () => {
  it("authenticates with a valid session-backed access token", async () => {
    const sessions = new Map<string, MockSession>();
    const { app, tokenService, refreshTokenRepo } = createApp({ sessions });
    const tokens = tokenService.issueTokens({ sessionId: "sess_1", userId: "usr_auth" });
    await refreshTokenRepo.createSession({
      id: "sess_1",
      token: tokens.refreshToken,
      userId: "usr_auth",
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES * 1000),
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { userId: string; sessionId: string } }>();
    assert.equal(body.data.userId, "usr_auth");
    assert.equal(body.data.sessionId, "sess_1");
  });

  it("rejects requests without an Authorization header", async () => {
    const { app } = createApp({ sessions: new Map() });
    const client = createTestClient(app);

    const response = await client.request({ method: "GET", path: "/protected" });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("rejects a revoked session", async () => {
    const sessions = new Map<string, MockSession>();
    const { app, tokenService, refreshTokenRepo } = createApp({ sessions });
    const tokens = tokenService.issueTokens({ sessionId: "sess_revoked", userId: "usr_auth" });
    await refreshTokenRepo.createSession({
      id: "sess_revoked",
      token: tokens.refreshToken,
      userId: "usr_auth",
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES * 1000),
    });
    // Simulate logout — revoke the session
    await refreshTokenRepo.revokeSession("sess_revoked", new Date());

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.TOKEN_EXPIRED);
  });

  it("rejects a refresh token used as an access token", async () => {
    const sessions = new Map<string, MockSession>();
    const { app, tokenService, refreshTokenRepo } = createApp({ sessions });
    const tokens = tokenService.issueTokens({ sessionId: "sess_2", userId: "usr_auth" });
    await refreshTokenRepo.createSession({
      id: "sess_2",
      token: tokens.refreshToken,
      userId: "usr_auth",
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES * 1000),
    });

    const client = createTestClient(app);
    // Use the REFRESH token as Bearer — must be rejected
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${tokens.refreshToken}` },
    });

    assert.equal(response.statusCode, 401);
    const code = response.json<{ error: { code: string } }>().error.code;
    assert.ok(
      code === ErrorCodes.UNAUTHORIZED || code === ErrorCodes.TOKEN_EXPIRED,
      `Expected UNAUTHORIZED or TOKEN_EXPIRED, got ${code}`,
    );
  });

  it("rejects a deleted user even with valid session", async () => {
    const sessions = new Map<string, MockSession>();
    const { app, tokenService, refreshTokenRepo } = createApp({ sessions });
    const tokens = tokenService.issueTokens({ sessionId: "sess_deleted", userId: "usr_deleted" });
    const session = await refreshTokenRepo.createSession({
      id: "sess_deleted",
      token: tokens.refreshToken,
      userId: "usr_deleted",
      expiresAt: new Date(Date.now() + REFRESH_EXPIRES * 1000),
    });
    // Mark the user as deleted
    session.user = createUser({ id: "usr_deleted", deletedAt: new Date() });

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });

    assert.equal(response.statusCode, 401);
  });

  it("rejects an expired access token with 401", async () => {
    const sessions = new Map<string, MockSession>();
    const { app } = createApp({ sessions });

    // Create a token that is already expired (exp in the past)
    const now = Math.floor(Date.now() / 1000);
    const expiredToken = jwt.sign(
      { sub: "usr_auth", sid: "sess_exp", typ: "access", exp: now - 60 },
      JWT_SECRET,
    );

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${expiredToken}` },
    });

    assert.equal(response.statusCode, 401);
    const code = response.json<{ error: { code: string } }>().error.code;
    // Expired tokens get TOKEN_EXPIRED from jwt.TokenExpiredError handling
    assert.ok(
      code === ErrorCodes.TOKEN_EXPIRED || code === ErrorCodes.UNAUTHORIZED,
      `Expected TOKEN_EXPIRED or UNAUTHORIZED, got ${code}`,
    );
  });

  it("rejects malformed tokens", async () => {
    const { app } = createApp({ sessions: new Map() });
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: "Bearer not-a-valid-jwt" },
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("accepts a legacy token with phone claim and no typ", async () => {
    const users = new Map<string, User>();
    const user = createUser();
    users.set(user.id, user);

    const { app } = createApp({ sessions: new Map(), users });

    // Legacy token: has phone, no typ
    const legacyToken = jwt.sign({ phone: "+919876543210" }, JWT_SECRET, { expiresIn: 3600 });

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${legacyToken}` },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { userId: string; sessionId: string } }>();
    assert.equal(body.data.userId, "usr_auth");
    assert.equal(body.data.sessionId, "legacy-session");
  });

  it("rejects new-format tokens that fail session lookup (prevents session revocation bypass)", async () => {
    const { app } = createApp({ sessions: new Map(), users: new Map() });

    // New-format token WITH typ claim but no matching session
    const newFormatToken = jwt.sign(
      { sub: "usr_auth", sid: "sess_nonexistent", typ: "access" },
      JWT_SECRET,
      { expiresIn: 3600 },
    );

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/protected",
      headers: { authorization: `Bearer ${newFormatToken}` },
    });

    assert.equal(response.statusCode, 401);
    // Must NOT fall through to legacy auth
    const body = response.json<{ data?: { sessionId?: string } }>();
    assert.ok(!body.data?.sessionId || body.data.sessionId !== "legacy-session",
      "New-format token must not be authenticated via legacy path");
  });
});
