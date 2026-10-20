import type { OtpMessageResponse, ResendOtpRequest, VerifyOtpRequest } from "../types/otp";
import type { UserResponse } from "../types/user";
import { api } from "./index";

export async function verifyOtp(
  request: VerifyOtpRequest
): Promise<UserResponse> {
  const response = await api.post("/auth/otp/verify", {
    email: request.email,
    code: request.code
  });
  return response.data;
}

export async function resendOtp(
  request: ResendOtpRequest
): Promise<OtpMessageResponse> {
  const response = await api.post("/auth/otp/resend", {
    email: request.email
  });
  return response.data;
}
