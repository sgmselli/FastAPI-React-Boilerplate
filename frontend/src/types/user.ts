export interface UserCreateRequest {
    name: string;
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
    name: string;
    email: string;
}
