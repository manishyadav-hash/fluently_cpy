import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TokenService } from "./token.service";

describe("TokenService", () => {
  it("issues and verifies session-backed access tokens", () => {
    const service = new TokenService({
      jwtSecret: "phase-0-secret",
      accessTokenExpiresInSeconds: 3600,
      refreshTokenExpiresInSeconds: 60 * 60 * 24 * 30,
    });

    const tokens = service.issueTokens({
      userId: "usr_phase0",
      sessionId: "session_phase0",
    });

    assert.equal(tokens.tokenType, "Bearer");
    assert.equal(tokens.expiresIn, 3600);
    assert.ok(tokens.accessToken.length > 0);
    assert.ok(tokens.refreshToken.length > 0);

    const payload = service.verifyAccessToken(tokens.accessToken);
    assert.deepEqual(payload, {
      userId: "usr_phase0",
      sessionId: "session_phase0",
    });
  });
});
