import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import { sendOtpSchema, sendOtpValidation, verifyOtpSchema, verifyOtpValidation } from "../validations/auth.validation";
import { updateProfileSchema, updateProfileValidation } from "../validations/user.validation";
import { createTestClient } from "../test/support/test-client";
import { validate } from "./validate";

function createApp() {
  const app = express();
  app.use(express.json());

  app.post("/api/auth/otp/send", validate(sendOtpSchema, sendOtpValidation), (_req, res) => {
    res.json({ success: true });
  });

  app.post("/api/auth/otp/verify", validate(verifyOtpSchema, verifyOtpValidation), (_req, res) => {
    res.json({ success: true });
  });

  app.patch("/api/users/me", validate(updateProfileSchema, updateProfileValidation), (_req, res) => {
    res.json({ success: true });
  });

  return app;
}

describe("validate middleware", () => {
  it("returns INVALID_PHONE for an empty OTP send body", async () => {
    const client = createTestClient(createApp());
    const response = await client.request({
      method: "POST",
      path: "/api/auth/otp/send",
      json: {},
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
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "INVALID_PHONE",
        message: "Phone number format is invalid",
        details: {
          field_errors: {
            phone: ["Phone number format is invalid"],
          },
          form_errors: [],
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns the contract envelope for invalid OTP verification input", async () => {
    const client = createTestClient(createApp());
    const response = await client.request({
      method: "POST",
      path: "/api/auth/otp/verify",
      json: { phone: "x", otp: "1" },
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
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "INVALID_PHONE",
        message: "Phone number format is invalid",
        details: {
          field_errors: {
            phone: ["Phone number format is invalid"],
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

  it("returns VALIDATION_ERROR for an empty profile update", async () => {
    const client = createTestClient(createApp());
    const response = await client.request({
      method: "PATCH",
      path: "/api/users/me",
      json: {},
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
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "At least one field must be provided",
        details: {
          field_errors: {},
          form_errors: ["At least one field must be provided"],
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns INVALID_EMAIL for a malformed profile email", async () => {
    const client = createTestClient(createApp());
    const response = await client.request({
      method: "PATCH",
      path: "/api/users/me",
      json: { email: "not-an-email" },
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
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "INVALID_EMAIL",
        message: "Email format is invalid",
        details: {
          field_errors: {
            email: ["Email format is invalid"],
          },
          form_errors: [],
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });

  it("returns NAME_TOO_LONG for a profile name over 100 characters", async () => {
    const client = createTestClient(createApp());
    const response = await client.request({
      method: "PATCH",
      path: "/api/users/me",
      json: { name: "a".repeat(101) },
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
      meta: {
        timestamp: string;
      };
      success: false;
    }>();

    assert.equal(response.statusCode, 400);
    assert.deepEqual(body, {
      success: false,
      error: {
        code: "NAME_TOO_LONG",
        message: "Name exceeds 100 characters",
        details: {
          field_errors: {
            name: ["Name exceeds 100 characters"],
          },
          form_errors: [],
        },
      },
      meta: {
        timestamp: body.meta.timestamp,
      },
    });
  });
});
