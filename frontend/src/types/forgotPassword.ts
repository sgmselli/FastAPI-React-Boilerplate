export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    token: string;
    password: string;
    confirmPassword: string;
}

export interface ValidateResetTokenRequest {
    token: string;
}

export interface ValidateResetTokenResponse {
    valid: boolean;
}

export interface PasswordResetMessageResponse {
    message: string;
}
