import { createContext, useContext, useState, useEffect, useCallback } from "react";

import { getCurrentUser, loginUser, logoutUser } from "../api/user";
import { verifyOtp } from "../api/otp";
import type { UserLoginRequest, UserResponse } from "../types/user";

interface AuthContextType {
  user: UserResponse | null;
  loadingUser: boolean;
  login: (requestData: UserLoginRequest) => Promise<UserResponse>;
  verifyEmail: (email: string, code: string) => Promise<UserResponse>;
  logout: () => Promise<void>;
  setUser: (user: UserResponse | null) => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserResponse | null>(null);
    const [loadingUser, setLoadingUser] = useState<boolean>(true);

    useEffect(() => {
        const handleFetch = async () => {
            try {
                const data = await getCurrentUser();
                setUser(data);
            } catch {
                // No valid session - `user` is already null on mount, so there
                // is nothing to clear here.
            } finally {
                setLoadingUser(false);
            }
        }
        handleFetch();
    }, []);

    // Memoised so consumers can safely list these in effect dependency arrays -
    // a fresh function identity each render would otherwise re-fire those effects.
    const login = useCallback(async (loginRequestData: UserLoginRequest): Promise<UserResponse> => {
        const { id, email, display_name, profile } = await loginUser({email: loginRequestData.email, password: loginRequestData.password});
        const userData = {id: id, email: email, display_name: display_name, profile: profile}
        setUser(userData);
        return userData
    }, []);

    const verifyEmail = useCallback(async (email: string, code: string): Promise<UserResponse> => {
        const userData = await verifyOtp({ email, code });
        setUser(userData);
        return userData;
    }, []);

    const logout = useCallback(async () => {
        await logoutUser();
        setUser(null);
    }, []);

    const isAuthenticated = () => !!user && !loadingUser;

    return (
        <AuthContext.Provider value={{ user, loadingUser, login, verifyEmail, logout, setUser, isAuthenticated }}>
            {children}
        </AuthContext.Provider>
    );
}

// Fast Refresh prefers a module to export only components, but splitting this
// hook into its own file would churn every consumer for an HMR nicety.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)!;