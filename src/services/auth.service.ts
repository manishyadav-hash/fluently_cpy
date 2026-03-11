import { randomInt, randomUUID } from "node:crypto";
import type { User } from "@prisma/client";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import type { DatabaseClient } from "../prisma/client";
import { prisma } from "../prisma/client";
import { OtpRepository } from "../repositories/otp.repository";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { UserRepository } from "../repositories/user.repository";
import { ConsoleOtpDeliveryService, type OtpDeliveryServiceContract } from "./otp-delivery.service";
import { TokenService } from "./token.service";

interface SendOtpResult {
  expiresInSeconds: number;
  otpSent: boolean;
  phoneMasked: string;
  resendCooldownSeconds: number;
}

interface VerifyOtpResult {
  accessToken: string;
  expiresIn: number;
  isNewUser: boolean;
  refreshToken: string;
  tokenType: "Bearer";
  user: User;
}

interface RefreshTokenResult {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: "Bearer";
}

interface LogoutResult {
  loggedOut: boolean;
}

interface OtpRepositoryPort {
  countCreatedSince(identifier: string, since: Date): Promise<number>;
  create(data: { code: string; expiresAt: Date; identifier: string }): Promise<unknown>;
  findLatest(identifier: string): Promise<{
    attemptCount: number;
    code: string;
    createdAt: Date;
    expiresAt: Date;
    id: string;
    identifier: string;
    usedAt: Date | null;
  } | null>;
  incrementAttemptCount(id: string): Promise<number>;
  markUsed(id: string, usedAt: Date): Promise<void>;
}

interface UserRepositoryPort {
  create(data: { phone: string }): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByPhone(phone: string): Promise<User | null>;
  softDelete(id: string): Promise<void>;
  update(id: string, data: { avatarUrl?: string | null; email?: string; name?: string }): Promise<User>;
}

interface RefreshTokenRepositoryPort {
  createSession(data: { expiresAt: Date; id: string; token: string; userId: string }): Promise<{
    createdAt: Date;
    expiresAt: Date;
    id: string;
    revokedAt: Date | null;
    token: string;
    user: User;
    userId: string;
  }>;
  findActiveSessionById(id: string): Promise<{
    createdAt: Date;
    expiresAt: Date;
    id: string;
    revokedAt: Date | null;
    token: string;
    user: User;
    userId: string;
  } | null>;
  revokeSession(id: string, revokedAt: Date): Promise<void>;
}

interface AuthRateLimits {
  otpExpirySeconds: number;
  otpMaxSendAttemptsPerWindow: number;
  otpRateLimitWindowSeconds: number;
  otpResendCooldownSeconds: number;
  otpVerifyMaxAttempts: number;
  refreshTokenExpiresInSeconds: number;
}

interface AuthServiceDependencies {
  createOtpRepository?: (db?: DatabaseClient) => OtpRepositoryPort;
  createRefreshTokenRepository?: (db?: DatabaseClient) => RefreshTokenRepositoryPort;
  createSessionId?: () => string;
  createUserRepository?: (db?: DatabaseClient) => UserRepositoryPort;
  generateOtpCode?: () => string;
  now?: () => Date;
  otpDeliveryService?: OtpDeliveryServiceContract;
  rateLimits?: AuthRateLimits;
  runInTransaction?: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
  tokenService?: TokenService;
}

export interface AuthServiceContract {
  logout(sessionId: string): Promise<LogoutResult>;
  refreshToken(refreshToken: string): Promise<RefreshTokenResult>;
  resendOtp(phone: string): Promise<SendOtpResult>;
  sendOtp(phone: string): Promise<SendOtpResult>;
  verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult>;
}

export class AuthService implements AuthServiceContract {
  private readonly createOtpRepository: (db?: DatabaseClient) => OtpRepositoryPort;
  private readonly createRefreshTokenRepository: (db?: DatabaseClient) => RefreshTokenRepositoryPort;
  private readonly createSessionId: () => string;
  private readonly createUserRepository: (db?: DatabaseClient) => UserRepositoryPort;
  private readonly generateOtpCode: () => string;
  private readonly now: () => Date;
  private readonly otpDeliveryService: OtpDeliveryServiceContract;
  private readonly rateLimits: AuthRateLimits;
  private readonly runInTransaction: <T>(callback: (db: DatabaseClient) => Promise<T>) => Promise<T>;
  private readonly tokenService: TokenService;

  constructor(dependencies: AuthServiceDependencies = {}) {
    this.createOtpRepository = dependencies.createOtpRepository ?? (db => new OtpRepository(db));
    this.createRefreshTokenRepository = dependencies.createRefreshTokenRepository ?? (db => new RefreshTokenRepository(db));
    this.createSessionId = dependencies.createSessionId ?? (() => randomUUID());
    this.createUserRepository = dependencies.createUserRepository ?? (db => new UserRepository(db));
    this.generateOtpCode = dependencies.generateOtpCode ?? (() => randomInt(0, 1_000_000).toString().padStart(6, "0"));
    this.now = dependencies.now ?? (() => new Date());
    this.otpDeliveryService = dependencies.otpDeliveryService ?? new ConsoleOtpDeliveryService();
    this.rateLimits = dependencies.rateLimits ?? {
      otpExpirySeconds: env.OTP_EXPIRY_SECONDS,
      otpMaxSendAttemptsPerWindow: env.OTP_MAX_SEND_ATTEMPTS_PER_WINDOW,
      otpRateLimitWindowSeconds: env.OTP_RATE_LIMIT_WINDOW_SECONDS,
      otpResendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      otpVerifyMaxAttempts: env.OTP_VERIFY_MAX_ATTEMPTS,
      refreshTokenExpiresInSeconds: env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    };
    this.runInTransaction = dependencies.runInTransaction ?? (callback => prisma.$transaction(tx => callback(tx)));
    this.tokenService = dependencies.tokenService ?? new TokenService({
      accessTokenExpiresInSeconds: env.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
      jwtSecret: env.JWT_SECRET,
      refreshTokenExpiresInSeconds: env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
    });
  }

  async sendOtp(phone: string): Promise<SendOtpResult> {
    return this.issueOtp(phone, ErrorCodes.OTP_RATE_LIMITED);
  }

  async resendOtp(phone: string): Promise<SendOtpResult> {
    return this.issueOtp(phone, ErrorCodes.RESEND_COOLDOWN);
  }

  async verifyOtp(phone: string, otp: string): Promise<VerifyOtpResult> {
    return this.runInTransaction(async db => {
      const now = this.now();
      const otpRepository = this.createOtpRepository(db);
      const userRepository = this.createUserRepository(db);
      const refreshTokenRepository = this.createRefreshTokenRepository(db);

      const challenge = await otpRepository.findLatest(phone);
      if (!challenge || challenge.usedAt) {
        throw new AppError("OTP code is incorrect", 400, ErrorCodes.INVALID_OTP);
      }

      if (challenge.expiresAt <= now) {
        throw new AppError("OTP has expired. Request a new one.", 410, ErrorCodes.OTP_EXPIRED);
      }

      if (challenge.attemptCount >= this.rateLimits.otpVerifyMaxAttempts) {
        throw new AppError("Too many failed verification attempts.", 429, ErrorCodes.TOO_MANY_ATTEMPTS);
      }

      if (challenge.code !== otp) {
        const attemptCount = await otpRepository.incrementAttemptCount(challenge.id);
        if (attemptCount >= this.rateLimits.otpVerifyMaxAttempts) {
          throw new AppError("Too many failed verification attempts.", 429, ErrorCodes.TOO_MANY_ATTEMPTS);
        }

        throw new AppError("OTP code is incorrect", 400, ErrorCodes.INVALID_OTP);
      }

      await otpRepository.markUsed(challenge.id, now);

      let user = await userRepository.findByPhone(phone);
      let isNewUser = false;

      if (!user) {
        user = await userRepository.create({ phone });
        isNewUser = true;
      }

      if (user.deletedAt) {
        throw new AppError("Deleted accounts cannot authenticate.", 401, ErrorCodes.UNAUTHORIZED);
      }

      const sessionId = this.createSessionId();
      const tokens = this.tokenService.issueTokens({
        sessionId,
        userId: user.id,
      });

      await refreshTokenRepository.createSession({
        id: sessionId,
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(now.getTime() + this.rateLimits.refreshTokenExpiresInSeconds * 1000),
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        isNewUser,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
        user,
      };
    });
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResult> {
    return this.runInTransaction(async db => {
      const now = this.now();
      const refreshTokenRepository = this.createRefreshTokenRepository(db);
      const payload = this.verifyStoredRefreshToken(refreshToken);
      const session = await refreshTokenRepository.findActiveSessionById(payload.sessionId);

      if (!session || session.userId !== payload.userId || session.token !== refreshToken || session.user.deletedAt) {
        throw new AppError(
          "Refresh token is invalid or revoked.",
          401,
          ErrorCodes.INVALID_REFRESH_TOKEN,
        );
      }

      await refreshTokenRepository.revokeSession(session.id, now);

      const nextSessionId = this.createSessionId();
      const tokens = this.tokenService.issueTokens({
        sessionId: nextSessionId,
        userId: session.userId,
      });

      await refreshTokenRepository.createSession({
        id: nextSessionId,
        token: tokens.refreshToken,
        userId: session.userId,
        expiresAt: new Date(now.getTime() + this.rateLimits.refreshTokenExpiresInSeconds * 1000),
      });

      return {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        refreshToken: tokens.refreshToken,
        tokenType: tokens.tokenType,
      };
    });
  }

  async logout(sessionId: string): Promise<LogoutResult> {
    const refreshTokenRepository = this.createRefreshTokenRepository();
    await refreshTokenRepository.revokeSession(sessionId, this.now());

    return {
      loggedOut: true,
    };
  }

  private async issueOtp(phone: string, errorCode: typeof ErrorCodes.OTP_RATE_LIMITED | typeof ErrorCodes.RESEND_COOLDOWN) {
    const now = this.now();
    const otpRepository = this.createOtpRepository();
    const otpCode = this.generateOtpCode();
    const latestChallenge = await otpRepository.findLatest(phone);

    if (latestChallenge) {
      const retryAfterSeconds = Math.ceil(
        (latestChallenge.createdAt.getTime() + this.rateLimits.otpResendCooldownSeconds * 1000 - now.getTime()) / 1000,
      );

      if (retryAfterSeconds > 0) {
        throw this.buildRateLimitError(errorCode, retryAfterSeconds);
      }
    }

    const sendAttempts = await otpRepository.countCreatedSince(
      phone,
      new Date(now.getTime() - this.rateLimits.otpRateLimitWindowSeconds * 1000),
    );

    if (sendAttempts >= this.rateLimits.otpMaxSendAttemptsPerWindow) {
      throw this.buildRateLimitError(errorCode, this.rateLimits.otpResendCooldownSeconds);
    }

    await otpRepository.create({
      identifier: phone,
      code: otpCode,
      expiresAt: new Date(now.getTime() + this.rateLimits.otpExpirySeconds * 1000),
    });

    await this.otpDeliveryService.sendOtp({
      phone,
      otp: otpCode,
      expiresInSeconds: this.rateLimits.otpExpirySeconds,
    });

    return {
      expiresInSeconds: this.rateLimits.otpExpirySeconds,
      otpSent: true,
      phoneMasked: maskPhone(phone),
      resendCooldownSeconds: this.rateLimits.otpResendCooldownSeconds,
    };
  }

  private buildRateLimitError(
    code: typeof ErrorCodes.OTP_RATE_LIMITED | typeof ErrorCodes.RESEND_COOLDOWN,
    retryAfter: number,
  ) {
    const message = code === ErrorCodes.OTP_RATE_LIMITED
      ? `Too many OTP requests. Please try again in ${retryAfter} seconds.`
      : "Must wait before resending.";

    return new AppError(
      message,
      429,
      code,
      { retry_after: retryAfter },
      { "Retry-After": String(retryAfter) },
    );
  }

  private verifyStoredRefreshToken(refreshToken: string) {
    try {
      return this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError(
        "Refresh token is invalid or revoked.",
        401,
        ErrorCodes.INVALID_REFRESH_TOKEN,
      );
    }
  }
}

function maskPhone(phone: string) {
  const localDigitsLength = Math.min(10, phone.length);
  const countryPrefix = phone.slice(0, Math.max(0, phone.length - localDigitsLength));
  const visibleSuffix = phone.slice(-3);
  const maskedMiddleLength = Math.max(0, phone.length - countryPrefix.length - visibleSuffix.length);

  return `${countryPrefix}${"X".repeat(maskedMiddleLength)}${visibleSuffix}`;
}
