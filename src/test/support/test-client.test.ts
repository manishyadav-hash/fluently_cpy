import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { createTestClient } from "./test-client";

describe("createTestClient", () => {
  it("invokes an Express app without binding a port", async () => {
    const app = express();
    app.use(express.json());

    app.post("/echo", (req, res) => {
      res.status(201).json({
        body: req.body,
        header: req.headers["x-test-id"],
      });
    });

    const client = createTestClient(app);
    const response = await client.request({
      method: "POST",
      path: "/echo",
      headers: {
        "x-test-id": "phase-0",
      },
      json: {
        hello: "world",
      },
    });

    assert.equal(response.statusCode, 201);
    assert.deepEqual(response.json(), {
      body: {
        hello: "world",
      },
      header: "phase-0",
    });
  });
});
