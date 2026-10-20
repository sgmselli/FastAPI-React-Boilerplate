import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { resendOtp } from "../../api/otp";
import { useAuth } from "../../contexts/auth";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";
import { parseApiError } from "../../utils/apiErrors";

// Mirrors otp_resend_cooldown_seconds on the backend, which ignores resends inside it
export const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

export const VerifyEmail: React.FC = () => {
    // Register and Login pass the email in navigation state, which survives a refresh
    const location = useLocation();
    const email = (location.state as { email?: string } | null)?.email;

    // -----------------------------
    // Form State
    // -----------------------------
    const [code, setCode] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [resending, setResending] = useState<boolean>(false);
    const [resendMessage, setResendMessage] = useState<string | null>(null);
    // A code was sent just before arriving here, so the cooldown starts straight away
    const [secondsUntilResend, setSecondsUntilResend] = useState<number>(RESEND_COOLDOWN_SECONDS);

    const { verifyEmail } = useAuth();

    const navigate = useNavigate();

    useEffect(() => {
        if (secondsUntilResend <= 0) return;

        const timer = setTimeout(() => setSecondsUntilResend((seconds) => seconds - 1), 1000);
        return () => clearTimeout(timer);
    }, [secondsUntilResend]);

    // -----------------------------
    // Handle Verify
    // -----------------------------
    const handleVerify = async () => {
        if (!email) return;

        setLoading(true);
        setError(null);
        setResendMessage(null);

        try {
            await verifyEmail(email, code);
            navigate("/auth/callback");
        } catch (e: unknown) {
            // No per-field messages on this form - validation errors get the fallback too
            const { message } = parseApiError(e, "Failed to verify your email.");
            setError(message ?? "Failed to verify your email.");
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Handle Resend
    // -----------------------------
    const handleResend = async () => {
        if (!email) return;

        setResending(true);
        setError(null);
        setResendMessage(null);

        try {
            const { message } = await resendOtp({ email });
            setResendMessage(message);
            setCode("");
            setSecondsUntilResend(RESEND_COOLDOWN_SECONDS);
        } catch (e: unknown) {
            const { message } = parseApiError(e, "Failed to send a new code.");
            setError(message ?? "Failed to send a new code.");
        } finally {
            setResending(false);
        }
    };

    usePageTitle("Verify your email");

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">
                        <div className="flex flex-col items-start gap-1">
                            <h1 className="text-4xl font-semibold primary-color">Verify your email</h1>
                            {
                                email && (
                                    <p className="text-lg mt-2 text-gray-500">
                                        We sent a 6-digit code to <span className="font-semibold">{email}</span>. It expires in 10 minutes.
                                    </p>
                                )
                            }
                        </div>

                        {
                            !email ? (
                                // Opened directly, so there's no email to verify - signing in
                                // to an unverified account sends a new code and comes back here
                                <div className="flex flex-col space-y-5">
                                    <p className="text-[16px] text-gray-700">
                                        Sign in to get a new verification code.
                                    </p>

                                    <p className="mt-2 text-[16px] text-gray-700">
                                        <span className="underline hover:text-blue-400">
                                            <Link to="/login">Go to sign in</Link>
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

                                    {
                                        resendMessage && (
                                            <p className="text-[16px] text-gray-700">{resendMessage}</p>
                                        )
                                    }

                                    <div className="flex flex-col space-y-5">
                                        <label className="form-control">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="6-digit code"
                                                className={`input input-lg input-bordered w-full text-lg tracking-[0.5em] ${error && "input-error"}`}
                                                name="code"
                                                autoComplete="one-time-code"
                                                aria-label="Verification code input"
                                                maxLength={CODE_LENGTH}
                                                value={code}
                                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
                                                required
                                            />
                                        </label>

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <button
                                                type="submit"
                                                onClick={handleVerify}
                                                disabled={loading || code.length !== CODE_LENGTH}
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Verify email button"
                                            >
                                                {
                                                    loading ?
                                                        <div className="surface-color">
                                                            <Loading size="sm" />
                                                        </div>
                                                    :
                                                        <p>Verify email</p>
                                                }
                                            </button>
                                        </div>

                                        <p className="text-[16px] text-gray-700">
                                            Didn't get it? Check your spam folder, or{" "}
                                            {
                                                secondsUntilResend > 0 ? (
                                                    <span className="text-gray-500">request a new code in {secondsUntilResend}s</span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={handleResend}
                                                        disabled={resending}
                                                        aria-label="Resend code button"
                                                        className="underline hover:text-blue-400 cursor-pointer"
                                                    >
                                                        send a new code
                                                    </button>
                                                )
                                            }
                                            .
                                        </p>

                                        <p className="mt-2 text-[16px] text-gray-700">
                                            <span className="underline hover:text-blue-400">
                                                <Link to="/login">Back to sign in</Link>
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
