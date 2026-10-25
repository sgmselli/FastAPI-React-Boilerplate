export interface UserProfileUpdateRequest {
    name: string;
}

export interface UserProfileResponse {
    name: string | null;
    is_profile_completed: boolean;
    // A presigned URL that expires, or null to show the default image
    profile_picture_url: string | null;
}
