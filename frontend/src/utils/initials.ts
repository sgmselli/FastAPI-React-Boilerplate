import type { UserResponse } from "../types/user";

// Falls back to the email's first letter until a name is saved
export const getInitials = (user: UserResponse): string => {
    const { first_name, last_name } = user.profile;
    const initials = [first_name, last_name].map((name) => name?.trim().charAt(0) ?? "").join("");
    return (initials || user.email.charAt(0)).toUpperCase();
};
