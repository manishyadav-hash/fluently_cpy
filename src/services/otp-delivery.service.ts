interface SendOtpInput {
  expiresInSeconds: number;
  otp: string;
  phone: string;
}

export interface OtpDeliveryServiceContract {
  sendOtp(input: SendOtpInput): Promise<void>;
}

export class ConsoleOtpDeliveryService implements OtpDeliveryServiceContract {
  async sendOtp(input: SendOtpInput): Promise<void> {
    console.info(
      `[OTP DELIVERY PLACEHOLDER] phone=${input.phone} otp=${input.otp} expires_in_seconds=${input.expiresInSeconds}`,
    );
  }
}
