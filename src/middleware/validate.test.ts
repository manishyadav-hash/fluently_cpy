import assert from "node:assert/strict";
import { describe, it } from "node:test";
import express from "express";
import request from "supertest";
import { sendOtpSchema, sendOtpValidation, verifyOtpSchema, verifyOtpValidation } from "../validations/auth.validation";
import { updateProfileSchema, updateProfileValidation } from "../validations/user.validation";
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
    const response = await request(createApp())
      .post("/api/auth/otp/send")
      .send({});

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
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
    });
  });

  it("returns the contract envelope for invalid OTP verification input", async () => {
    const response = await request(createApp())
      .post("/api/auth/otp/verify")
      .send({ phone: "x", code: "1" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: "INVALID_PHONE",
        message: "Phone number format is invalid",
        details: {
          field_errors: {
            phone: ["Phone number format is invalid"],
            code: ["OTP code is incorrect"],
          },
          form_errors: [],
        },
      },
    });
  });

  it("returns VALIDATION_ERROR for an empty profile update", async () => {
    const response = await request(createApp())
      .patch("/api/users/me")
      .send({});

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "At least one field must be provided",
        details: {
          field_errors: {},
          form_errors: ["At least one field must be provided"],
        },
      },
    });
  });

  it("returns INVALID_EMAIL for a malformed profile email", async () => {
    const response = await request(createApp())
      .patch("/api/users/me")
      .send({ email: "not-an-email" });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
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
    });
  });

  it("returns NAME_TOO_LONG for a profile name over 100 characters", async () => {
    const response = await request(createApp())
      .patch("/api/users/me")
      .send({ name: "a".repeat(101) });

    assert.equal(response.status, 400);
    assert.deepEqual(response.body, {
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
    });
  });
});
