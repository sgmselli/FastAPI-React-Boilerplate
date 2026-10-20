export interface VerifyOtpRequest {
    email: string;
    code: string;
}

export interface ResendOtpRequest {
    email: string;
}

export interface OtpMessageResponse {
    message: string;
}
