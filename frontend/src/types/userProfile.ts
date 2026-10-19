export interface UserProfileUpdateRequest {
    name: string;
}

export interface UserProfileResponse {
    name: string | null;
    is_profile_completed: boolean;
}
