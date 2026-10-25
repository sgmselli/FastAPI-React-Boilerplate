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

export async function uploadProfilePicture(file: File): Promise<UserResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await apiAuth.put("/profile/current/picture", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return response.data;
}

export async function deleteProfilePicture(): Promise<UserResponse> {
  const response = await apiAuth.delete("/profile/current/picture");
  return response.data;
}
