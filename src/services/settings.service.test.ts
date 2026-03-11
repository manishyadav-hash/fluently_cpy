import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  it("returns default settings when the user has no saved row", async () => {
    const service = new SettingsService({
      createSettingsRepository: () => ({
        async findByUserId() {
          return null;
        },
        async upsert() {
          throw new Error("unused");
        },
      }),
    });

    const result = await service.getSettings("usr_settings");

    assert.equal(result.language, "en");
    assert.equal(result.notificationsEnabled, true);
    assert.equal(result.dailyReminderTime, "09:00");
    assert.equal(result.availableLanguages.length, 2);
  });

  it("updates and returns persisted settings", async () => {
    const service = new SettingsService({
      createSettingsRepository: () => ({
        async findByUserId() {
          return {
            dailyReminderTime: "09:00",
            language: "en",
            notificationsEnabled: true,
          };
        },
        async upsert(userId, patch) {
          assert.equal(userId, "usr_settings");
          assert.equal(patch.language, "hi");
          assert.equal(patch.notificationsEnabled, false);
          return {
            dailyReminderTime: patch.dailyReminderTime ?? "09:00",
            language: patch.language ?? "en",
            notificationsEnabled: patch.notificationsEnabled ?? true,
          };
        },
      }),
    });

    const result = await service.updateSettings("usr_settings", {
      dailyReminderTime: "09:30",
      language: "hi",
      notificationsEnabled: false,
    });

    assert.equal(result.language, "hi");
    assert.equal(result.notificationsEnabled, false);
    assert.equal(result.dailyReminderTime, "09:30");
  });
});
