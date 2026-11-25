export interface UserProfileUpdateRequest {
    first_name: string;
    last_name: string;
}

export interface UserProfileResponse {
    first_name: string | null;
    last_name: string | null;
    is_profile_completed: boolean;
}
