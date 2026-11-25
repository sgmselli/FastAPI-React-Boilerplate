import type { UserResponse } from "../types/user";
import type { UserProfileUpdateRequest } from "../types/userProfile";
import { apiAuth } from "./index";

export async function updateCurrentUserProfile(
  profile: UserProfileUpdateRequest
): Promise<UserResponse> {
  const response = await apiAuth.patch("/profile/current", {
    first_name: profile.first_name,
    last_name: profile.last_name
  });
  return response.data;
}
