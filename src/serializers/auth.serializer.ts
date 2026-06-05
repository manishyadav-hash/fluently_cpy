import type { User } from "@prisma/client";
import { serializeUser } from "./user.serializer";

interface SendOtpResponse {
  expiresInSeconds: number;
  otpSent: boolean;
  phoneMasked: string;
  resendCooldownSeconds: number;
}

interface VerifyOtpResponse {
  accessToken: string;
  expiresIn: number;
  isNewUser: boolean;
  refreshToken: string;
  tokenType: "Bearer";
  user: User;
}

interface RefreshTokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  tokenType: "Bearer";
}

interface LogoutResponse {
  loggedOut: boolean;
}

export function serializeSendOtpResponse(response: SendOtpResponse) {
  return {
    otp_sent: response.otpSent,
    phone_masked: response.phoneMasked,
    expires_in_seconds: response.expiresInSeconds,
    resend_cooldown_seconds: response.resendCooldownSeconds,
  };
}

export function serializeVerifyOtpResponse(response: VerifyOtpResponse) {
  return {
    access_token: response.accessToken,
    refresh_token: response.refreshToken,
    token_type: response.tokenType,
    expires_in: response.expiresIn,
    user: serializeUser(response.user),
    is_new_user: response.isNewUser,
  };
}

export function serializeRefreshTokenResponse(response: RefreshTokenResponse) {
  return {
    access_token: response.accessToken,
    refresh_token: response.refreshToken,
    token_type: response.tokenType,
    expires_in: response.expiresIn,
  };
}

export function serializeLogoutResponse(response: LogoutResponse) {
  return {
    logged_out: response.loggedOut,
  };
}
