import jwt from "jsonwebtoken";

interface TokenServiceConfig {
  accessTokenExpiresInSeconds: number;
  jwtSecret: string;
  refreshTokenExpiresInSeconds: number;
}

interface IssueTokensInput {
  sessionId: string;
  userId: string;
}

interface AccessTokenPayload {
  sid: string;
  sub: string;
  typ: "access";
}

interface RefreshTokenPayload {
  sid: string;
  sub: string;
  typ: "refresh";
}

interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: "Bearer";
}

interface VerifiedAccessToken {
  sessionId: string;
  userId: string;
}

interface VerifiedRefreshToken {
  sessionId: string;
  userId: string;
}

export class TokenService {
  constructor(private readonly config: TokenServiceConfig) {}

  issueTokens(input: IssueTokensInput): IssuedTokens {
    const basePayload = {
      sid: input.sessionId,
      sub: input.userId,
    };

    const accessToken = jwt.sign(
      { ...basePayload, typ: "access" } satisfies AccessTokenPayload,
      this.config.jwtSecret,
      { expiresIn: this.config.accessTokenExpiresInSeconds },
    );

    const refreshToken = jwt.sign(
      { ...basePayload, typ: "refresh" } satisfies RefreshTokenPayload,
      this.config.jwtSecret,
      { expiresIn: this.config.refreshTokenExpiresInSeconds },
    );

    return {
      accessToken,
      expiresIn: this.config.accessTokenExpiresInSeconds,
      refreshToken,
      tokenType: "Bearer",
    };
  }

  verifyAccessToken(token: string): VerifiedAccessToken {
    const payload = jwt.verify(token, this.config.jwtSecret) as AccessTokenPayload;
    if (payload.typ !== "access") {
      throw new Error("Invalid access token type");
    }

    return {
      sessionId: payload.sid,
      userId: payload.sub,
    };
  }

  verifyRefreshToken(token: string): VerifiedRefreshToken {
    const payload = jwt.verify(token, this.config.jwtSecret) as RefreshTokenPayload;
    if (payload.typ !== "refresh") {
      throw new Error("Invalid refresh token type");
    }

    return {
      sessionId: payload.sid,
      userId: payload.sub,
    };
  }
}
