import type {
  ForgotPasswordRequest,
  PasswordResetMessageResponse,
  ResetPasswordRequest,
  ValidateResetTokenResponse
} from "../types/forgotPassword";
import { api } from "./index";

export async function requestPasswordReset(
  request: ForgotPasswordRequest
): Promise<PasswordResetMessageResponse> {
  const response = await api.post("/auth/password-reset/request", {
    email: request.email
  });
  return response.data;
}

export async function validatePasswordResetToken(
  token: string
): Promise<ValidateResetTokenResponse> {
  const response = await api.post("/auth/password-reset/validate", { token });
  return response.data;
}

export async function confirmPasswordReset(
  request: ResetPasswordRequest
): Promise<PasswordResetMessageResponse> {
  const response = await api.post("/auth/password-reset/confirm", {
    token: request.token,
    password: request.password,
    confirm_password: request.confirmPassword
  });
  return response.data;
}
