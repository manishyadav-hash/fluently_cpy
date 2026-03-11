import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubscriptionStatus, User } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { AuthService } from "./auth.service";
import { TokenService } from "./token.service";

type RefreshSessionRecord = {
  createdAt: Date;
  expiresAt: Date;
  id: string;
  revokedAt: Date | null;
  token: string;
  user: User;
  userId: string;
};

type OtpRecord = {
  attemptCount: number;
  code: string;
  createdAt: Date;
  expiresAt: Date;
  id: string;
  identifier: string;
  usedAt: Date | null;
};

function createUser(phone: string, overrides: Partial<User> = {}): User {
  const now = new Date("2026-02-28T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: null,
    id: overrides.id ?? `usr_${phone.slice(-4)}`,
    isOnboarded: false,
    name: null,
    phone,
    subscriptionStatus: "none" as SubscriptionStatus,
    updatedAt: now,
    ...overrides,
    trialUsedAt: overrides.trialUsedAt ?? null,
  };
}

function createServiceFixture(nowValue = new Date("2026-02-28T10:00:00.000Z")) {
  const otpRecords: OtpRecord[] = [];
  const users = new Map<string, User>();
  const sessions = new Map<string, RefreshSessionRecord>();
  let sessionSequence = 0;

  const tokenService = new TokenService({
    accessTokenExpiresInSeconds: 3600,
    jwtSecret: "phase-1-secret",
    refreshTokenExpiresInSeconds: 60 * 60 * 24 * 30,
  });

  const service = new AuthService({
    createRefreshTokenRepository: () => ({
      async createSession(data) {
        const user = Array.from(users.values()).find(candidate => candidate.id === data.userId)!;
        const record: RefreshSessionRecord = {
          createdAt: nowValue,
          expiresAt: data.expiresAt,
          id: data.id,
          revokedAt: null,
          token: data.token,
          user,
          userId: data.userId,
        };
        sessions.set(record.id, record);
        return record;
      },
      async findActiveSessionById(id) {
        const session = sessions.get(id);
        if (!session || session.revokedAt || session.expiresAt <= nowValue) {
          return null;
        }
        return session;
      },
      async revokeSession(id) {
        const session = sessions.get(id);
        if (session) {
          session.revokedAt = nowValue;
        }
      },
    }),
    createUserRepository: () => ({
      async create(data) {
        const user = createUser(data.phone, { id: `usr_${users.size + 1}` });
        users.set(user.phone, user);
        return user;
      },
      async findById(id) {
        return Array.from(users.values()).find(user => user.id === id) ?? null;
      },
      async findByPhone(phone) {
        return users.get(phone) ?? null;
      },
      async softDelete() {
        return;
      },
      async update() {
        throw new Error("unused");
      },
    }),
    createOtpRepository: () => ({
      async countCreatedSince(identifier, since) {
        return otpRecords.filter(record => record.identifier === identifier && record.createdAt >= since).length;
      },
      async create(data) {
        const record: OtpRecord = {
          attemptCount: 0,
          code: data.code,
          createdAt: nowValue,
          expiresAt: data.expiresAt,
          id: `otp_${otpRecords.length + 1}`,
          identifier: data.identifier,
          usedAt: null,
        };
        otpRecords.push(record);
        return record;
      },
      async findLatest(identifier) {
        return otpRecords.filter(record => record.identifier === identifier).at(-1) ?? null;
      },
      async incrementAttemptCount(id) {
        const record = otpRecords.find(entry => entry.id === id)!;
        record.attemptCount += 1;
        return record.attemptCount;
      },
      async markUsed(id, usedAt) {
        const record = otpRecords.find(entry => entry.id === id)!;
        record.usedAt = usedAt;
      },
    }),
    generateOtpCode: () => "123456",
    now: () => nowValue,
    otpDeliveryService: {
      async sendOtp() {
        return;
      },
    },
    rateLimits: {
      otpExpirySeconds: 300,
      otpMaxSendAttemptsPerWindow: 3,
      otpRateLimitWindowSeconds: 300,
      otpResendCooldownSeconds: 30,
      otpVerifyMaxAttempts: 3,
      refreshTokenExpiresInSeconds: 60 * 60 * 24 * 30,
    },
    runInTransaction: async callback => callback({} as never),
    tokenService,
    createSessionId: () => `session_${++sessionSequence}`,
  });

  return {
    otpRecords,
    service,
    sessions,
    tokenService,
    users,
  };
}

describe("AuthService", () => {
  it("sends OTPs with contract cooldown metadata and phone masking", async () => {
    const fixture = createServiceFixture();

    const result = await fixture.service.sendOtp("+919483898443");

    assert.deepEqual(result, {
      otpSent: true,
      phoneMasked: "+91XXXXXXX443",
      expiresInSeconds: 300,
      resendCooldownSeconds: 30,
    });
    assert.equal(fixture.otpRecords.length, 1);
  });

  it("rate limits rapid OTP send requests", async () => {
    const fixture = createServiceFixture();

    await fixture.service.sendOtp("+919483898443");

    await assert.rejects(
      fixture.service.sendOtp("+919483898443"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 429);
        assert.equal(error.code, ErrorCodes.OTP_RATE_LIMITED);
        assert.deepEqual(error.details, { retry_after: 30 });
        assert.deepEqual(error.headers, { "Retry-After": "30" });
        return true;
      },
    );
  });

  it("verifies an OTP, creates a new user, and issues session-backed tokens", async () => {
    const fixture = createServiceFixture();
    await fixture.service.sendOtp("+919483898443");

    const result = await fixture.service.verifyOtp("+919483898443", "123456");

    assert.equal(result.isNewUser, true);
    assert.equal(result.tokenType, "Bearer");
    assert.equal(result.expiresIn, 3600);
    assert.equal(result.user.phone, "+919483898443");
    assert.ok(result.accessToken.length > 0);
    assert.ok(result.refreshToken.length > 0);
    assert.equal(fixture.sessions.size, 1);
  });

  it("tracks invalid OTP attempts and blocks after the configured limit", async () => {
    const fixture = createServiceFixture();
    await fixture.service.sendOtp("+919483898443");

    await assert.rejects(fixture.service.verifyOtp("+919483898443", "000000"), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCodes.INVALID_OTP);
      return true;
    });

    await assert.rejects(fixture.service.verifyOtp("+919483898443", "000000"), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.code, ErrorCodes.INVALID_OTP);
      return true;
    });

    await assert.rejects(fixture.service.verifyOtp("+919483898443", "000000"), (error: unknown) => {
      assert.ok(error instanceof AppError);
      assert.equal(error.statusCode, 429);
      assert.equal(error.code, ErrorCodes.TOO_MANY_ATTEMPTS);
      return true;
    });
  });

  it("rotates refresh tokens", async () => {
    const fixture = createServiceFixture();
    await fixture.service.sendOtp("+919483898443");
    const verified = await fixture.service.verifyOtp("+919483898443", "123456");

    const rotated = await fixture.service.refreshToken(verified.refreshToken);

    assert.equal(rotated.tokenType, "Bearer");
    assert.equal(rotated.expiresIn, 3600);
    assert.notEqual(rotated.refreshToken, verified.refreshToken);
    assert.equal(fixture.sessions.size, 2);
    assert.equal(
      Array.from(fixture.sessions.values()).filter(session => session.revokedAt === null).length,
      1,
    );
  });

  it("revokes the current session on logout", async () => {
    const fixture = createServiceFixture();
    await fixture.service.sendOtp("+919483898443");
    const verified = await fixture.service.verifyOtp("+919483898443", "123456");
    const sessionId = fixture.tokenService.verifyRefreshToken(verified.refreshToken).sessionId;

    const result = await fixture.service.logout(sessionId);

    assert.deepEqual(result, { loggedOut: true });
    assert.ok(fixture.sessions.get(sessionId)?.revokedAt);
  });
});
