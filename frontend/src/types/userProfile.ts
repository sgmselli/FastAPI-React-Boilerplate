export interface UserProfileUpdateRequest {
    first_name: string;
    last_name: string;
}

export interface UserProfileResponse {
    first_name: string | null;
    last_name: string | null;
    is_profile_completed: boolean;
    // A presigned URL that expires, or null to show the default image
    profile_picture_url: string | null;
}
