import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import axios from "axios";

import type { ResetPasswordRequest } from "../../types/forgotPassword";
import { confirmPasswordReset, validatePasswordResetToken } from "../../api/forgotPassword";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";

type ResetPasswordFieldErrors = {
    password?: string;
    confirm_password?: string;
};

type ApiValidationError = {
    loc: (string | number)[];
    msg: string;
};

export const ResetPassword: React.FC = () => {
    // -----------------------------
    // Token State
    // -----------------------------
    const [token, setToken] = useState<string | null>(null);
    const [checkingToken, setCheckingToken] = useState<boolean>(true);
    const [tokenValid, setTokenValid] = useState<boolean>(false);

    // -----------------------------
    // Form State
    // -----------------------------
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<ResetPasswordFieldErrors>({});
    const [submitted, setSubmitted] = useState<boolean>(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // -----------------------------
    // Read the token out of the URL and check it is still usable
    //
    // The link puts the token in the fragment, which never reaches a server.
    // It is lifted into state and wiped from the address bar straight away so
    // it does not linger in browser history or get picked up by analytics.
    // -----------------------------
    useEffect(() => {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const tokenFromUrl = params.get("token");

        window.history.replaceState(null, "", window.location.pathname);

        if (!tokenFromUrl) {
            setCheckingToken(false);
            return;
        }

        setToken(tokenFromUrl);

        const validateToken = async () => {
            try {
                const response = await validatePasswordResetToken(tokenFromUrl);
                setTokenValid(response.valid);
            } catch {
                setTokenValid(false);
            } finally {
                setCheckingToken(false);
            }
        };

        validateToken();
    }, []);

    // -----------------------------
    // Build reset password payload
    // -----------------------------
    const buildResetPasswordData = (): ResetPasswordRequest => {
        return {
            token: token ?? "",
            password,
            confirmPassword
        };
    };

    // -----------------------------
    // Handle Reset Password
    // -----------------------------
    const handleResetPassword = async () => {
        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            await confirmPasswordReset(buildResetPasswordData());
            setSubmitted(true);
        } catch (err: unknown) {
            const detail = axios.isAxiosError(err) ? err.response?.data?.detail : undefined;

            // Check if detail is a string (simple error message)
            if (typeof detail === 'string') {
                setError(detail);
            }
            // Check if detail is an array (field validation errors)
            else if (Array.isArray(detail)) {
                const apiErrors: ResetPasswordFieldErrors = {};

                (detail as ApiValidationError[]).forEach((e) => {
                    const field = e.loc[1] as keyof ResetPasswordFieldErrors;
                    apiErrors[field] = e.msg;
                });

                setFieldErrors(apiErrors);
            } else {
                setError("Failed to reset password.");
            }
        } finally {
            setLoading(false);
        }
    };

    usePageTitle("Reset password");

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">

                        {
                            checkingToken ? (
                                <div className="flex justify-center py-10">
                                    <Loading />
                                </div>
                            ) : !tokenValid ? (
                                <>
                                    <div className="flex flex-col items-start gap-1">
                                        <h1 className="text-4xl font-semibold primary-color">Link expired</h1>
                                        <p className="text-lg mt-2 text-gray-500">
                                            This password reset link is invalid or has expired.
                                        </p>
                                    </div>

                                    <div className="flex flex-col space-y-5">
                                        <p className="text-[16px] text-gray-700">
                                            Reset links last 15 minutes and can only be used once. Request a new
                                            one to carry on.
                                        </p>

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <Link
                                                to="/forgot-password"
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Request a new reset link button"
                                            >
                                                Request a new link
                                            </Link>
                                        </div>

                                        <p className="mt-2 text-[16px] text-gray-700">
                                            <span className="underline hover:text-blue-400">
                                                <Link to="/login">Back to sign in</Link>
                                            </span>
                                        </p>
                                    </div>
                                </>
                            ) : submitted ? (
                                <>
                                    <div className="flex flex-col items-start gap-1">
                                        <h1 className="text-4xl font-semibold primary-color">Password reset</h1>
                                        <p className="text-lg mt-2 text-gray-500">
                                            Your password has been reset.
                                        </p>
                                    </div>

                                    <div className="flex flex-col space-y-5">
                                        <p className="text-[16px] text-gray-700">
                                            You've been signed out everywhere else. Sign in with your new password
                                            to carry on.
                                        </p>

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <Link
                                                to="/login"
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Sign in button"
                                            >
                                                Sign in
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col items-start gap-1">
                                        <h1 className="text-4xl font-semibold primary-color">Reset password</h1>
                                        <p className="text-lg mt-2 text-gray-500">
                                            Choose a new password for your account.
                                        </p>
                                    </div>

                                    {
                                        error && (
                                            <p className="text-error">{error}</p>
                                        )
                                    }

                                    <div className="flex flex-col space-y-5">
                                        <label className="form-control relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                placeholder="New password"
                                                className={`input input-lg input-bordered w-full text-sm pr-12 ${fieldErrors.password ? "input-error" : ""}`}
                                                name="password"
                                                autoComplete="new-password"
                                                aria-label="New password input"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                            />

                                            <div className="absolute right-4 top-0 h-12 flex items-center z-20">
                                                <button
                                                    type="button"
                                                    className="text-gray-600 cursor-pointer"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>

                                            {fieldErrors.password && (
                                                <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                                            )}
                                        </label>

                                        <label className="form-control relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Confirm new password"
                                                className={`input input-lg input-bordered w-full text-sm pr-12 ${fieldErrors.confirm_password ? "input-error" : ""}`}
                                                name="confirm_password"
                                                autoComplete="new-password"
                                                aria-label="Confirm new password input"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                required
                                            />

                                            <div className="absolute right-4 top-0 h-12 flex items-center z-20">
                                                <button
                                                    type="button"
                                                    className="text-gray-600 cursor-pointer"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    tabIndex={-1}
                                                >
                                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>

                                            {fieldErrors.confirm_password && (
                                                <p className="text-red-500 text-sm mt-1">{fieldErrors.confirm_password}</p>
                                            )}
                                        </label>

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <button
                                                type="submit"
                                                onClick={handleResetPassword}
                                                disabled={loading}
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Reset password button"
                                            >
                                                {
                                                    loading ?
                                                        <div className="surface-color">
                                                            <Loading size="sm" />
                                                        </div>
                                                    :
                                                        <p>Reset password</p>
                                                }
                                            </button>
                                        </div>

                                        <p className="mt-2 text-[16px] text-gray-700">
                                            Remembered your password?{" "}
                                            <span className="underline hover:text-blue-400">
                                                <Link to="/login">Sign in</Link>
                                            </span>
                                        </p>
                                    </div>
                                </>
                            )
                        }

                    </div>
                </div>
            </div>
        </section>
    );
};
