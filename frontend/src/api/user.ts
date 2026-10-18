import type { UserResponse, UserCreateRequest, UserLoginRequest, UserUpdateRequest } from "../types/user";
import { api, apiAuth } from "./index";

export async function registerUser(
  user: UserCreateRequest
): Promise<UserResponse> {
  const response = await api.post("/user/register", {
    name: user.name,
    email: user.email,
    password: user.password,
    confirm_password: user.confirmPassword
  });
  return response.data;
}

export async function loginUser(
  user: UserLoginRequest
): Promise<UserResponse> {

    const form = new URLSearchParams();
    form.append("username", user.email);
    form.append("password", user.password);

    const response = await api.post(
        "/auth/login", 
        form,
        {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
        }
    );
  return response.data;
}

export async function logoutUser(
): Promise<UserResponse> {
  const response = await apiAuth.post("/auth/logout");
  return response.data;
}

export async function getCurrentUser(
): Promise<UserResponse> {
  const response = await apiAuth.get("/user/current");
  return response.data;
}

export async function updateCurrentUser(
  user: UserUpdateRequest
): Promise<UserResponse> {
  const response = await apiAuth.patch("/user/current", {
    name: user.name
  });
  return response.data;
}

export async function deleteCurrentUser(
): Promise<void> {
  await apiAuth.delete("/user/current");
}
