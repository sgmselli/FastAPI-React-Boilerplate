import type { UserProfileResponse } from "./userProfile";

export interface UserCreateRequest {
    email: string;
    password: string;
    confirmPassword: string;
}

export interface UserLoginRequest {
    email: string;
    password: string;
}

export interface UserResponse {
    id: number;
    email: string;
    // The profile name, or the email when no name has been set
    display_name: string;
    profile: UserProfileResponse;
}
