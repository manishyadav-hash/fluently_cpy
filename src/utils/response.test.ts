import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { AppError } from "../errors/app-error";
import { errorHandler } from "../middleware/error-handler";
import { createTestClient } from "../test/support/test-client";
import { sendPaginatedSuccess, sendSuccess } from "./response";

describe("response helpers", () => {
  it("adds contract meta to success responses", async () => {
    const app = express();

    app.get("/success", (_req, res) => {
      sendSuccess(res, { ok: true }, 201);
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/success",
    });
    const body = response.json<{
      data: {
        ok: boolean;
      };
      meta: {
        timestamp: string;
      };
      success: true;
    }>();

    assert.equal(response.statusCode, 201);
    assert.deepEqual(body, {
      success: true,
      data: {
        ok: true,
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("adds contract meta and details to AppError responses", async () => {
    const app = express();

    app.get("/error", (_req, _res, next) => {
      next(new AppError("Access token is invalid", 401, "UNAUTHORIZED", {
        reason: "missing_bearer",
      }));
    });
    app.use(errorHandler);

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/error",
    });
    const body = response.json<{
      error: {
        code: string;
        details: {
          reason: string;
        };
        message: string;
      };
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 401);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Access token is invalid",
        details: {
          reason: "missing_bearer",
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("adds contract meta to paginated success responses", async () => {
    const app = express();

    app.get("/messages", (_req, res) => {
      sendPaginatedSuccess(res, [{ id: "msg_001" }], {
        has_more: true,
        next_cursor: "cursor_123",
      });
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "GET",
      path: "/messages",
    });
    const body = response.json<{
      data: Array<{ id: string }>;
      meta: {
        timestamp: string;
      };
      pagination: {
        has_more: boolean;
        next_cursor: string | null;
      };
      success: true;
    }>();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(body, {
      success: true,
      data: [{ id: "msg_001" }],
      pagination: {
        has_more: true,
        next_cursor: "cursor_123",
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });
});
