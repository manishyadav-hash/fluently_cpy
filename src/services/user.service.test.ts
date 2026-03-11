import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "@prisma/client";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { UserService } from "./user.service";

function createUser(overrides: Partial<User> = {}): User {
  const now = new Date("2026-02-28T10:00:00.000Z");
  return {
    avatarUrl: null,
    createdAt: now,
    deletedAt: null,
    email: "user@example.com",
    id: "usr_abc123",
    isOnboarded: true,
    name: "User",
    phone: "+919483898443",
    subscriptionStatus: "none",
    updatedAt: now,
    ...overrides,
    trialUsedAt: overrides.trialUsedAt ?? null,
  };
}

describe("UserService", () => {
  it("stores the avatar via the storage abstraction and persists the url", async () => {
    let savedUrl = "";
    const service = new UserService({
      avatarStorage: {
        async deleteAvatar() {
          return;
        },
        async saveAvatar(userId, file) {
          assert.equal(userId, "usr_abc123");
          assert.equal(file.mimetype, "image/jpeg");
          return "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300";
        },
      },
      userRepository: {
        async findById() { return createUser(); },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update(id, data) {
          savedUrl = data.avatarUrl ?? "";
          return createUser({ avatarUrl: data.avatarUrl ?? null });
        },
      },
    });

    const avatarUrl = await service.uploadAvatar("usr_abc123", {
      buffer: Buffer.from("jpeg"),
      mimetype: "image/jpeg",
      originalname: "avatar.jpg",
    } as Express.Multer.File);

    assert.equal(avatarUrl, "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300");
    assert.equal(savedUrl, "https://cdn.fluently.app/avatars/usr_abc123.jpg?v=1709118300");
  });

  it("deletes the avatar via the storage abstraction when present", async () => {
    let deletedAvatarUrl = "";
    const service = new UserService({
      avatarStorage: {
        async deleteAvatar(avatarUrl) {
          deletedAvatarUrl = avatarUrl;
        },
        async saveAvatar() {
          throw new Error("unused");
        },
      },
      userRepository: {
        async findById() { return createUser({ avatarUrl: "https://cdn.fluently.app/avatars/usr_abc123.jpg" }); },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { return createUser({ avatarUrl: null }); },
      },
    });

    await service.deleteAvatar("usr_abc123");

    assert.equal(deletedAvatarUrl, "https://cdn.fluently.app/avatars/usr_abc123.jpg");
  });

  it("throws UNAUTHORIZED when deleting a missing user account", async () => {
    const service = new UserService({
      avatarStorage: {
        async deleteAvatar() { return; },
        async saveAvatar() { throw new Error("unused"); },
      },
      userRepository: {
        async findById() { return null; },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() { throw new Error("unused"); },
      },
    });

    await assert.rejects(
      service.deleteAccount("usr_missing"),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 404);
        return true;
      },
    );
  });

  it("maps duplicate email persistence failures to EMAIL_CONFLICT", async () => {
    const service = new UserService({
      avatarStorage: {
        async deleteAvatar() { return; },
        async saveAvatar() { throw new Error("unused"); },
      },
      userRepository: {
        async findById() { return createUser(); },
        async findByPhone() { return null; },
        async markOnboarded() { return; },
        async softDelete() { return; },
        async update() {
          const error = new Error("Unique constraint failed");
          Object.assign(error, {
            code: "P2002",
            meta: {
              target: ["email"],
            },
          });
          throw error;
        },
      },
    });

    await assert.rejects(
      service.updateProfile("usr_abc123", { email: "used@example.com" }),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.statusCode, 409);
        assert.equal(error.code, ErrorCodes.EMAIL_CONFLICT);
        return true;
      },
    );
  });
});
