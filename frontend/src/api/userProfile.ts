import type { UserResponse } from "../types/user";
import type { UserProfileUpdateRequest } from "../types/userProfile";
import { apiAuth } from "./index";

export async function updateCurrentUserProfile(
  profile: UserProfileUpdateRequest
): Promise<UserResponse> {
  const response = await apiAuth.patch("/profile/current", {
    name: profile.name
  });
  return response.data;
}
