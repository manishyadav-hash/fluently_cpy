import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { ErrorCodes } from "../errors/error-codes";
import { RefreshTokenRepository } from "../repositories/refresh-token.repository";
import { UserRepository } from "../repositories/user.repository";
import { TokenService } from "../services/token.service";

interface JwtPayload {
  phone: string;
}

interface AuthenticateDependencies {
  refreshTokenRepository?: RefreshTokenRepository;
  tokenService?: TokenService;
  userRepository?: UserRepository;
}

export function createAuthenticate(dependencies: AuthenticateDependencies = {}) {
  const refreshTokenRepository = dependencies.refreshTokenRepository ?? new RefreshTokenRepository();
  const tokenService = dependencies.tokenService ?? new TokenService({
    jwtSecret: env.JWT_SECRET,
    accessTokenExpiresInSeconds: env.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    refreshTokenExpiresInSeconds: env.REFRESH_TOKEN_EXPIRES_IN_SECONDS,
  });
  const userRepository = dependencies.userRepository ?? new UserRepository();

  return async function authenticate(req: Request, _res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        throw new AppError("Missing or invalid authorization header", 401, ErrorCodes.UNAUTHORIZED);
      }

      const token = authHeader.split(" ")[1];
      const auth = await resolveAuthentication(token, refreshTokenRepository, tokenService, userRepository);

      req.auth = auth;
      req.user = auth.user;
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }

      if (error instanceof jwt.TokenExpiredError) {
        return next(new AppError("Access token has expired", 401, ErrorCodes.TOKEN_EXPIRED));
      }

      return next(new AppError("Invalid or expired token", 401, ErrorCodes.UNAUTHORIZED));
    }
  };
}

export const authenticate = createAuthenticate();

async function resolveAuthentication(
  token: string,
  refreshTokenRepository: RefreshTokenRepository,
  tokenService: TokenService,
  userRepository: UserRepository,
) {
  try {
    const payload = tokenService.verifyAccessToken(token);
    const session = await refreshTokenRepository.findActiveSessionById(payload.sessionId);
    if (!session || session.userId !== payload.userId || session.user.deletedAt) {
      throw new AppError("Access token has expired", 401, ErrorCodes.TOKEN_EXPIRED);
    }

    return {
      sessionId: payload.sessionId,
      user: session.user,
      userId: payload.userId,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await userRepository.findByPhone(decoded.phone);
    if (!user || user.deletedAt) {
      throw new AppError("Invalid or expired token", 401, ErrorCodes.UNAUTHORIZED);
    }

    return {
      sessionId: "legacy-session",
      user,
      userId: user.id,
    };
  }
}
