import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import type { User } from "@prisma/client";
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { errorHandler } from "../middleware/error-handler";
import type { ContentServiceContract } from "../services/content.service";
import type { SettingsServiceContract } from "../services/settings.service";
import { createTestClient } from "../test/support/test-client";
import { createContentRouter } from "./content.routes";
import { createSettingsRouter } from "./settings.routes";

function createUser(): User {
  const now = new Date("2026-03-01T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "settings-user@example.com",
    id: "usr_settings",
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
    if (req.headers.authorization !== "Bearer phase-6") {
      next(new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED));
      return;
    }

    req.auth = {
      sessionId: "session_phase6",
      userId: "usr_settings",
    };
    req.user = createUser();
    next();
  };
}

function createSettingsService(): SettingsServiceContract {
  return {
    async getSettings() {
      throw new Error("unused");
    },
    async updateSettings() {
      throw new Error("unused");
    },
  };
}

function createContentService(): ContentServiceContract {
  return {
    async getHelpSupport() {
      throw new Error("unused");
    },
    async getPrivacyPolicy() {
      throw new Error("unused");
    },
    async getRefundPolicy() {
      throw new Error("unused");
    },
    async getTermsAndConditions() {
      throw new Error("unused");
    },
  };
}

function createApp(settingsService: SettingsServiceContract, contentService: ContentServiceContract) {
  const app = express();
  app.use(express.json());
  app.use("/v1/settings", createSettingsRouter({
    authenticateMiddleware: createAuthMiddleware(),
    settingsService,
  }));
  app.use("/v1/content", createContentRouter({
    contentService,
  }));
  app.use("/api/settings", createSettingsRouter({
    authenticateMiddleware: createAuthMiddleware(),
    settingsService,
  }));
  app.use("/api/content", createContentRouter({
    contentService,
  }));
  app.use(errorHandler);
  return app;
}

describe("settings and content routes", () => {
  it("returns settings for GET /v1/settings", async () => {
    const settingsService = createSettingsService();
    settingsService.getSettings = async userId => {
      assert.equal(userId, "usr_settings");
      return {
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "hi", name: "Hindi" },
        ],
        dailyReminderTime: "09:00",
        language: "en",
        notificationsEnabled: true,
      };
    };
    const app = createApp(settingsService, createContentService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/settings",
      headers: { authorization: "Bearer phase-6" },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{
      data: {
        available_languages: Array<{ code: string }>;
        daily_reminder_time: string;
        language: string;
        notifications_enabled: boolean;
      };
    }>();
    assert.equal(body.data.language, "en");
    assert.equal(body.data.available_languages[1]?.code, "hi");
  });

  it("requires auth for GET /v1/settings", async () => {
    const app = createApp(createSettingsService(), createContentService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/settings",
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.UNAUTHORIZED);
  });

  it("updates settings for PATCH /v1/settings", async () => {
    const settingsService = createSettingsService();
    settingsService.updateSettings = async (userId, patch) => {
      assert.equal(userId, "usr_settings");
      assert.equal(patch.language, "hi");
      return {
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "hi", name: "Hindi" },
        ],
        dailyReminderTime: "09:30",
        language: "hi",
        notificationsEnabled: false,
      };
    };
    const app = createApp(settingsService, createContentService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/settings",
      headers: { authorization: "Bearer phase-6" },
      json: {
        language: "hi",
        notifications_enabled: false,
        daily_reminder_time: "09:30",
      },
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { daily_reminder_time: string; language: string; notifications_enabled: boolean } }>();
    assert.equal(body.data.language, "hi");
    assert.equal(body.data.notifications_enabled, false);
    assert.equal(body.data.daily_reminder_time, "09:30");
  });

  it("validates unsupported settings languages", async () => {
    const app = createApp(createSettingsService(), createContentService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/settings",
      headers: { authorization: "Bearer phase-6" },
      json: { language: "fr" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.INVALID_LANGUAGE);
  });

  it("validates invalid reminder times", async () => {
    const app = createApp(createSettingsService(), createContentService());
    const client = createTestClient(app);

    const response = await client.request({
      method: "PATCH",
      path: "/v1/settings",
      headers: { authorization: "Bearer phase-6" },
      json: { daily_reminder_time: "25:61" },
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.json<{ error: { code: string } }>().error.code, ErrorCodes.INVALID_TIME_FORMAT);
  });

  it("returns the privacy policy without auth", async () => {
    const contentService = createContentService();
    contentService.getPrivacyPolicy = async () => ({
      contentHtml: "<h1>Privacy Policy</h1><p>...</p>",
      lastUpdated: "2026-01-15",
      title: "Privacy Policy",
    });
    const app = createApp(createSettingsService(), contentService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/content/privacy-policy",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { title: string } }>().data.title, "Privacy Policy");
  });

  it("keeps /api/content/privacy-policy as a compatibility alias", async () => {
    const contentService = createContentService();
    contentService.getPrivacyPolicy = async () => ({
      contentHtml: "<h1>Privacy Policy</h1><p>...</p>",
      lastUpdated: "2026-01-15",
      title: "Privacy Policy",
    });
    const app = createApp(createSettingsService(), contentService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/api/content/privacy-policy",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { title: string } }>().data.title, "Privacy Policy");
  });

  it("returns the terms and conditions page", async () => {
    const contentService = createContentService();
    contentService.getTermsAndConditions = async () => ({
      contentHtml: "<h1>Terms & Conditions</h1><p>...</p>",
      lastUpdated: "2026-01-15",
      title: "Terms & Conditions",
    });
    const app = createApp(createSettingsService(), contentService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/content/terms-and-conditions",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { title: string } }>().data.title, "Terms & Conditions");
  });

  it("returns the refund policy page", async () => {
    const contentService = createContentService();
    contentService.getRefundPolicy = async () => ({
      contentHtml: "<h1>Pricing & Refund Policy</h1><p>...</p>",
      lastUpdated: "2026-01-15",
      title: "Pricing & Refund Policy",
    });
    const app = createApp(createSettingsService(), contentService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/content/refund-policy",
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ data: { title: string } }>().data.title, "Pricing & Refund Policy");
  });

  it("returns help and support with the support email", async () => {
    const contentService = createContentService();
    contentService.getHelpSupport = async () => ({
      contentHtml: "<h1>Help & Support</h1><p>...</p>",
      lastUpdated: "2026-01-15",
      supportEmail: "support@fluently.app",
      title: "Help & Support",
    });
    const app = createApp(createSettingsService(), contentService);
    const client = createTestClient(app);

    const response = await client.request({
      method: "GET",
      path: "/v1/content/help-support",
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<{ data: { support_email: string; title: string } }>();
    assert.equal(body.data.title, "Help & Support");
    assert.equal(body.data.support_email, "support@fluently.app");
  });
});
