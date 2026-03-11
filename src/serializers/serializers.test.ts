import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "@prisma/client";
import { serializeUser } from "./user.serializer";
import {
  serializeSendOtpResponse,
  serializeVerifyOtpResponse,
  serializeRefreshTokenResponse,
  serializeLogoutResponse,
} from "./auth.serializer";
import {
  serializeTrialOffer,
  serializeSubscriptionPlan,
  serializeCheckoutSubscription,
  serializeCurrentSubscription,
  serializeCancelledSubscription,
  serializeInvoice,
} from "./subscription.serializer";
import {
  serializeSettings,
  serializeContentPage,
  serializeHelpSupport,
} from "./settings.serializer";
import {
  serializeChatSuggestion,
  serializeConversation,
  serializeChatMessage,
  serializeSendMessageResult,
} from "./chat.serializer";

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-03-01T10:00:00.000Z");
  return {
    avatarUrl: "https://cdn.fluently.app/avatars/usr_1.jpg",
    createdAt: now,
    deletedAt: null,
    email: "test@example.com",
    id: "usr_1",
    isOnboarded: true,
    name: "Test User",
    phone: "+919876543210",
    subscriptionStatus: "active",
    trialUsedAt: new Date("2026-02-20T10:00:00.000Z"),
    updatedAt: now,
    ...overrides,
  };
}

describe("serializers", () => {
  describe("user serializer", () => {
    it("converts all fields to snake_case", () => {
      const user = createUser();
      const result = serializeUser(user);

      assert.deepEqual(Object.keys(result).sort(), [
        "avatar_url",
        "created_at",
        "email",
        "id",
        "is_onboarded",
        "name",
        "phone",
        "subscription_status",
        "updated_at",
      ]);
    });

    it("does not leak internal fields", () => {
      const user = createUser();
      const result = serializeUser(user);
      const keys = Object.keys(result);

      assert.ok(!keys.includes("deletedAt"), "must not include deletedAt");
      assert.ok(!keys.includes("deleted_at"), "must not include deleted_at");
      assert.ok(!keys.includes("trialUsedAt"), "must not include trialUsedAt");
      assert.ok(!keys.includes("trial_used_at"), "must not include trial_used_at");
    });

    it("converts dates to ISO strings", () => {
      const user = createUser();
      const result = serializeUser(user);

      assert.equal(result.created_at, "2026-03-01T10:00:00.000Z");
      assert.equal(result.updated_at, "2026-03-01T10:00:00.000Z");
    });
  });

  describe("auth serializer", () => {
    it("serializes send OTP response with snake_case keys", () => {
      const result = serializeSendOtpResponse({
        expiresInSeconds: 300,
        otpSent: true,
        phoneMasked: "+91****3210",
        resendCooldownSeconds: 30,
      });

      assert.deepEqual(Object.keys(result).sort(), [
        "expires_in_seconds",
        "otp_sent",
        "phone_masked",
        "resend_cooldown_seconds",
      ]);
      assert.equal(result.otp_sent, true);
    });

    it("serializes verify OTP response with nested user", () => {
      const result = serializeVerifyOtpResponse({
        accessToken: "at_123",
        expiresIn: 3600,
        isNewUser: false,
        refreshToken: "rt_456",
        tokenType: "Bearer",
        user: createUser(),
      });

      assert.equal(result.access_token, "at_123");
      assert.equal(result.is_new_user, false);
      assert.equal(result.user.id, "usr_1");
      assert.ok(!("deletedAt" in result.user));
    });

    it("serializes refresh token response", () => {
      const result = serializeRefreshTokenResponse({
        accessToken: "at_new",
        expiresIn: 3600,
        refreshToken: "rt_new",
        tokenType: "Bearer",
      });

      assert.deepEqual(Object.keys(result).sort(), [
        "access_token",
        "expires_in",
        "refresh_token",
        "token_type",
      ]);
    });

    it("serializes logout response", () => {
      const result = serializeLogoutResponse({ loggedOut: true });
      assert.deepEqual(result, { logged_out: true });
    });
  });

  describe("subscription serializer", () => {
    it("serializes trial offer with snake_case keys", () => {
      const result = serializeTrialOffer({
        autoRenew: false,
        benefits: ["Benefit 1"],
        durationDays: 7,
        priceAmount: 9,
        priceCurrency: "INR",
        warningText: "Don't miss out",
      });

      assert.equal(result.price_amount, 9);
      assert.equal(result.auto_renew, false);
      assert.equal(result.duration_days, 7);
    });

    it("serializes subscription plan with snake_case keys", () => {
      const result = serializeSubscriptionPlan({
        badge: "BEST",
        description: null,
        id: "plan_yearly",
        interval: "year",
        monthlyEquivalent: 67,
        name: "Yearly Plan",
        priceAmount: 799,
        priceCurrency: "INR",
      });

      assert.equal(result.price_amount, 799);
      assert.equal(result.monthly_equivalent, 67);
      assert.ok(!("priceAmount" in result));
    });

    it("serializes checkout subscription with dates as ISO strings", () => {
      const now = new Date("2026-03-01T10:00:00.000Z");
      const result = serializeCheckoutSubscription({
        cancelAtPeriodEnd: false,
        createdAt: now,
        currentPeriodEnd: null,
        currentPeriodStart: now,
        id: "sub_1",
        paymentUrl: "https://pay.fluently.app/checkout/sub_1",
        planId: "plan_monthly",
        status: "pending",
        trialEndDate: null,
      });

      assert.equal(result.cancel_at_period_end, false);
      assert.equal(result.current_period_start, "2026-03-01T10:00:00.000Z");
      assert.equal(result.trial_end_date, null);
      assert.equal(result.payment_url, "https://pay.fluently.app/checkout/sub_1");
    });

    it("serializes current subscription as null when absent", () => {
      const result = serializeCurrentSubscription(null);
      assert.equal(result, null);
    });

    it("serializes cancelled subscription", () => {
      const result = serializeCancelledSubscription({
        cancelAtPeriodEnd: true,
        currentPeriodEnd: new Date("2026-04-01T10:00:00.000Z"),
        id: "sub_1",
        status: "active",
      });

      assert.equal(result.cancel_at_period_end, true);
      assert.equal(result.current_period_end, "2026-04-01T10:00:00.000Z");
    });

    it("serializes invoice with snake_case keys", () => {
      const result = serializeInvoice({
        amount: 199,
        currency: "INR",
        invoiceDate: "2026-03-01",
        invoiceUrl: "https://pay.fluently.app/invoice/inv_1",
        planName: "Monthly Plan",
        status: "paid",
      });

      assert.equal(result.invoice_url, "https://pay.fluently.app/invoice/inv_1");
      assert.equal(result.plan_name, "Monthly Plan");
    });
  });

  describe("settings serializer", () => {
    it("serializes settings with snake_case keys and available_languages", () => {
      const result = serializeSettings({
        availableLanguages: [
          { code: "en", name: "English" },
          { code: "hi", name: "Hindi" },
        ],
        dailyReminderTime: "09:00",
        language: "en",
        notificationsEnabled: true,
      });

      assert.equal(result.notifications_enabled, true);
      assert.equal(result.daily_reminder_time, "09:00");
      assert.deepEqual(result.available_languages, [
        { code: "en", name: "English" },
        { code: "hi", name: "Hindi" },
      ]);
    });

    it("serializes content page with snake_case keys", () => {
      const result = serializeContentPage({
        contentHtml: "<p>Privacy</p>",
        lastUpdated: "2026-01-15",
        title: "Privacy Policy",
      });

      assert.equal(result.content_html, "<p>Privacy</p>");
      assert.equal(result.last_updated, "2026-01-15");
    });

    it("serializes help support with support_email", () => {
      const result = serializeHelpSupport({
        contentHtml: "<p>Help</p>",
        lastUpdated: "2026-01-15",
        supportEmail: "support@fluently.app",
        title: "Help & Support",
      });

      assert.equal(result.support_email, "support@fluently.app");
      assert.ok(!("supportEmail" in result));
    });
  });

  describe("chat serializer", () => {
    it("serializes chat suggestion with snake_case keys", () => {
      const result = serializeChatSuggestion({
        id: "sug_1",
        label: "Grammar",
        prompt: "Help with grammar",
      });

      assert.deepEqual(result, {
        id: "sug_1",
        label: "Grammar",
        prompt: "Help with grammar",
      });
    });

    it("serializes conversation with snake_case keys", () => {
      const result = serializeConversation({
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        id: "conv_1",
        lastMessageAt: new Date("2026-03-01T10:05:00.000Z"),
        messageCount: 5,
        userId: "usr_1",
      });

      assert.equal(result.message_count, 5);
      assert.equal(result.last_message_at, "2026-03-01T10:05:00.000Z");
      assert.equal(result.user_id, "usr_1");
      assert.ok(!("messageCount" in result));
    });

    it("serializes chat message with snake_case keys", () => {
      const result = serializeChatMessage({
        content: "Hello",
        conversationId: "conv_1",
        createdAt: new Date("2026-03-01T10:00:00.000Z"),
        id: "msg_1",
        role: "user",
      });

      assert.equal(result.conversation_id, "conv_1");
      assert.equal(result.created_at, "2026-03-01T10:00:00.000Z");
      assert.ok(!("conversationId" in result));
    });

    it("serializes send message result with snake_case keys", () => {
      const result = serializeSendMessageResult({
        tutorMessage: {
          content: "Reply",
          conversationId: "conv_1",
          createdAt: new Date("2026-03-01T10:01:00.000Z"),
          id: "msg_t",
          role: "tutor",
        },
        userMessage: {
          content: "Hello",
          conversationId: "conv_1",
          createdAt: new Date("2026-03-01T10:00:00.000Z"),
          id: "msg_u",
          role: "user",
        },
      });

      assert.equal(result.user_message.id, "msg_u");
      assert.equal(result.tutor_message.id, "msg_t");
      assert.equal(result.user_message.conversation_id, "conv_1");
    });
  });
});
