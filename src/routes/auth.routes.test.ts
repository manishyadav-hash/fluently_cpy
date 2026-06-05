import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { AuthServiceContract } from "../services/auth.service";
import { createTestClient } from "../test/support/test-client";
import { createAuthRouter } from "./auth.routes";

function createApp(service: AuthServiceContract, authenticateMiddleware?: RequestHandler) {
  const app = express();
  app.use(express.json());
  app.use("/v1/auth", createAuthRouter({ service, authenticateMiddleware }));
  app.use("/api/auth", createAuthRouter({ service, authenticateMiddleware }));
  app.use(errorHandler);
  return app;
}

describe("auth routes", () => {
  it("returns the contract response for POST /v1/auth/otp/send", async () => {
    const app = createApp({
      sendOtp: async () => ({
        expiresInSeconds: 300,
        otpSent: true,
        phoneMasked: "+91XXXXXXX443",
        resendCooldownSeconds: 30,
      }),
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/v1/auth/otp/send",
      json: { phone: "+919483898443" },
    });
    const body = response.json<{
      data: {
        expires_in_seconds: number;
        otp_sent: boolean;
        phone_masked: string;
        resend_cooldown_seconds: number;
      };
      meta: { timestamp: string };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        otp_sent: true,
        phone_masked: "+91XXXXXXX443",
        expires_in_seconds: 300,
        resend_cooldown_seconds: 30,
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("keeps /api/auth/otp/send as a compatibility alias", async () => {
    const app = createApp({
      sendOtp: async () => ({
        expiresInSeconds: 300,
        otpSent: true,
        phoneMasked: "+91XXXXXXX443",
        resendCooldownSeconds: 30,
      }),
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/api/auth/otp/send",
      json: { phone: "+919483898443" },
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { otp_sent: boolean } }>().data.otp_sent, true);
  });

  it("validates the otp field for POST /v1/auth/otp/verify", async () => {
    const app = createApp({
      sendOtp: async () => {
        throw new Error("not implemented");
      },
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/v1/auth/otp/verify",
      json: { phone: "+919483898443", otp: "123" },
    });
    const body = response.json<{
      error: {
        code: string;
        details: {
          field_errors: Record<string, string[]>;
          form_errors: string[];
        };
        message: string;
      };
      meta: { timestamp: string };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "INVALID_OTP",
        message: "OTP code is incorrect",
        details: {
          field_errors: {
            otp: ["OTP code is incorrect"],
          },
          form_errors: [],
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns the contract response for POST /v1/auth/otp/verify", async () => {
    const app = createApp({
      sendOtp: async () => {
        throw new Error("not implemented");
      },
      verifyOtp: async () => ({
        accessToken: "access-token",
        expiresIn: 3600,
        isNewUser: true,
        refreshToken: "refresh-token",
        tokenType: "Bearer" as const,
        user: {
          avatarUrl: null,
          createdAt: new Date("2026-02-28T10:00:00.000Z"),
          deletedAt: null,
          email: null,
          id: "usr_abc123",
          isOnboarded: false,
          name: null,
          phone: "+919483898443",
          subscriptionStatus: "none",
          trialUsedAt: null,
          updatedAt: new Date("2026-02-28T10:00:00.000Z"),
        },
      }),
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/v1/auth/otp/verify",
      json: { phone: "+919483898443", otp: "123456" },
    });
    const body = response.json<{
      data: {
        access_token: string;
        expires_in: number;
        is_new_user: boolean;
        refresh_token: string;
        token_type: string;
        user: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          id: string;
          is_onboarded: boolean;
          name: string | null;
          phone: string;
          subscription_status: string;
          updated_at: string;
        };
      };
      meta: { timestamp: string };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        access_token: "access-token",
        refresh_token: "refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
        is_new_user: true,
        user: {
          id: "usr_abc123",
          name: null,
          phone: "+919483898443",
          email: null,
          avatar_url: null,
          is_onboarded: false,
          subscription_status: "none",
          created_at: "2026-02-28T10:00:00.000Z",
          updated_at: "2026-02-28T10:00:00.000Z",
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns retry metadata for POST /v1/auth/otp/resend cooldowns", async () => {
    const app = createApp({
      sendOtp: async () => {
        throw new Error("not implemented");
      },
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new AppError("Must wait before resending.", 429, ErrorCodes.RESEND_COOLDOWN, {
          retry_after: 30,
        }, {
          "Retry-After": "30",
        });
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/v1/auth/otp/resend",
      json: { phone: "+919483898443" },
    });
    const body = response.json<{
      error: {
        code: string;
        details: {
          retry_after: number;
        };
        message: string;
      };
      meta: { timestamp: string };
      success: false;
    }>();

    assert.equal(response.statusCode, 429);
    assert.equal(response.headers["retry-after"], "30");
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "RESEND_COOLDOWN",
        message: "Must wait before resending.",
        details: {
          retry_after: 30,
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns INVALID_REFRESH_TOKEN for POST /v1/auth/token/refresh failures", async () => {
    const app = createApp({
      sendOtp: async () => {
        throw new Error("not implemented");
      },
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new AppError(
          "Refresh token is invalid or revoked.",
          401,
          ErrorCodes.INVALID_REFRESH_TOKEN,
        );
      },
      logout: async () => {
        throw new Error("not implemented");
      },
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/v1/auth/token/refresh",
      json: { refresh_token: "bad-token" },
    });
    const body = response.json<{
      error: {
        code: string;
        message: string;
      };
      meta: { timestamp: string };
      success: false;
    }>();

    assert.equal(response.statusCode, 401);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "INVALID_REFRESH_TOKEN",
        message: "Refresh token is invalid or revoked.",
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("requires auth for POST /v1/auth/logout", async () => {
    const authenticateMiddleware: RequestHandler = (req, _res, next) => {
      if (req.headers.authorization !== "Bearer phase1") {
        next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
        return;
      }

      req.auth = {
        sessionId: "session_123",
        userId: "usr_abc123",
      };
      next();
    };

    const app = createApp({
      sendOtp: async () => {
        throw new Error("not implemented");
      },
      verifyOtp: async () => {
        throw new Error("not implemented");
      },
      resendOtp: async () => {
        throw new Error("not implemented");
      },
      refreshToken: async () => {
        throw new Error("not implemented");
      },
      logout: async (sessionId) => ({
        loggedOut: sessionId === "session_123",
      }),
    }, authenticateMiddleware);

    const client = createTestClient(app);

    const unauthorized = await client.request({
      method: "POST",
      path: "/v1/auth/logout",
    });
    assert.equal(unauthorized.statusCode, 401);

    const authorized = await client.request({
      method: "POST",
      path: "/v1/auth/logout",
      headers: {
        authorization: "Bearer phase1",
      },
    });
    const body = authorized.json<{
      data: {
        logged_out: boolean;
      };
      meta: { timestamp: string };
      success: true;
    }>();

    assert.equal(authorized.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        logged_out: true,
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });
});
