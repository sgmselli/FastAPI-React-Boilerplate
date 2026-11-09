import { useState } from "react";
import { Link } from "react-router-dom";

import type { ForgotPasswordRequest } from "../../types/forgotPassword";
import { requestPasswordReset } from "../../api/forgotPassword";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";
import useCooldown from "../../hooks/useCooldown";
import { parseApiError } from "../../utils/apiErrors";
import { normalizeEmail } from "../../utils/normalizations";

// Mirrors password_reset_cooldown_seconds on the backend, which ignores requests inside it
export const REQUEST_COOLDOWN_SECONDS = 60;

export const ForgotPassword: React.FC = () => {
    // -----------------------------
    // Form State
    // -----------------------------
    const [email, setEmail] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<boolean>(false);

    // Tracked per email so a typo can be corrected straight away
    const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
    const { secondsLeft: secondsUntilResend, start: startResendCooldown } = useCooldown(REQUEST_COOLDOWN_SECONDS);

    const coolingDown = secondsUntilResend > 0 && normalizeEmail(email) === requestedEmail;

    // -----------------------------
    // Build forgot password payload
    // -----------------------------
    const buildForgotPasswordData = (): ForgotPasswordRequest => {
        return {
            email
        };
    };

    // -----------------------------
    // Handle Forgot Password
    // -----------------------------
    const handleForgotPassword = async () => {
        setLoading(true);
        setError(null);

        try {
            await requestPasswordReset(buildForgotPasswordData());
            setSubmitted(true);
            setRequestedEmail(normalizeEmail(email));
            startResendCooldown();
        } catch (e: unknown) {
            // No per-field messages on this form - validation errors get the fallback too
            const { message } = parseApiError(e, "Failed to send reset link.");
            setError(message ?? "Failed to send reset link.");
        } finally {
            setLoading(false);
        }
    };

    usePageTitle("Forgot password");

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">
                        <div className="flex flex-col items-start gap-1">
                            <h1 className="text-4xl font-semibold primary-color">Forgot password</h1>
                            <p className="text-lg mt-2 text-gray-500">
                                Enter your email and we'll send you a link to reset your password.
                            </p>
                        </div>

                        {
                            submitted ? (
                                // The same message shows whether or not the email is
                                // registered - confirming it exists would let anyone
                                // check which addresses have accounts.
                                <div className="flex flex-col space-y-5">
                                    {
                                        error && (
                                            <p className="text-error">{error}</p>
                                        )
                                    }

                                    <p className="text-[16px] text-gray-700">
                                        If an account exists for <span className="font-semibold">{email}</span>, we've sent a
                                        link to reset your password. The link expires in 15 minutes.
                                    </p>

                                    <p className="text-[16px] text-gray-700">
                                        Didn't get it? Check your spam folder, or{" "}
                                        {
                                            secondsUntilResend > 0 ? (
                                                <span className="text-gray-500">request another link in {secondsUntilResend}s</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleForgotPassword}
                                                    disabled={loading}
                                                    aria-label="Send another link button"
                                                    className="underline hover:text-blue-400 cursor-pointer"
                                                >
                                                    send another link
                                                </button>
                                            )
                                        }
                                        .
                                    </p>

                                    <p className="text-[16px] text-gray-700">
                                        Wrong email?{" "}
                                        <span className="underline hover:text-blue-400">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setError(null);
                                                    setSubmitted(false);
                                                }}
                                                aria-label="Try another email address button"
                                                className="cursor-pointer"
                                            >
                                                Try another email address
                                            </button>
                                        </span>
                                        .
                                    </p>

                                    <p className="mt-2 text-[16px] text-gray-700">
                                        <span className="underline hover:text-blue-400">
                                            <Link to="/login">Back to sign in</Link>
                                        </span>
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {
                                        error && (
                                            <p className="text-error">{error}</p>
                                        )
                                    }

                                    <div className="flex flex-col space-y-5">
                                        <label className="form-control">
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                className={`input input-lg input-bordered w-full text-sm ${error && "input-error"}`}
                                                name="email"
                                                autoComplete="email"
                                                aria-label="Email address input"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                required
                                            />
                                        </label>

                                        {
                                            coolingDown && (
                                                <p className="text-[16px] text-gray-500">
                                                    You can request another link for this email in {secondsUntilResend}s.
                                                </p>
                                            )
                                        }

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <button
                                                type="submit"
                                                onClick={handleForgotPassword}
                                                disabled={loading || coolingDown}
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Send reset link button"
                                            >
                                                {
                                                    loading ?
                                                        <div className="surface-color">
                                                            <Loading size="sm" className="surface-color" />
                                                        </div>
                                                    :
                                                        <p>Send reset link</p>
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