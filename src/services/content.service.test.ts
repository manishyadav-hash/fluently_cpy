import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ContentService } from "./content.service";

describe("ContentService", () => {
  it("returns help and support content with the support email", async () => {
    const service = new ContentService();

    const result = await service.getHelpSupport();

    assert.equal(result.title, "Help & Support");
    assert.equal(result.supportEmail, "support@fluently.app");
    assert.equal(result.lastUpdated, "2026-01-15");
  });
});
