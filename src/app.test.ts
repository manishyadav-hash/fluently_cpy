import assert from "node:assert/strict";
import { describe, it } from "node:test";
import app from "./app";
import { createTestClient } from "./test/support/test-client";

describe("app routing", () => {
  it("mounts the API router under /v1", async () => {
    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/v1/health",
    });
    const body = response.json<{
      data: {
        status: string;
      };
      meta: {
        timestamp: string;
      };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        status: "ok",
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("keeps /api as a compatibility alias", async () => {
    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/api/health",
    });
    const body = response.json<{
      data: {
        status: string;
      };
      meta: {
        timestamp: string;
      };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: {
        status: "ok",
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });
});
