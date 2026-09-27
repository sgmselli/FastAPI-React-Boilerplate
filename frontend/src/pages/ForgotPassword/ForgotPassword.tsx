import { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import type { ForgotPasswordRequest } from "../../types/forgotPassword";
import { requestPasswordReset } from "../../api/forgotPassword";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";

export const ForgotPassword: React.FC = () => {
    // -----------------------------
    // Form State
    // -----------------------------
    const [email, setEmail] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [submitted, setSubmitted] = useState<boolean>(false);

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
        } catch (e: unknown) {
            const detail = axios.isAxiosError(e) ? e.response?.data?.detail : undefined;
            setError(typeof detail === "string" ? detail : "Failed to send reset link.");
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
                                    <p className="text-[16px] text-gray-700">
                                        If an account exists for <span className="font-semibold">{email}</span>, we've sent a
                                        link to reset your password. The link expires in 15 minutes.
                                    </p>

                                    <p className="text-[16px] text-gray-700">
                                        Didn't get it? Check your spam folder, or{" "}
                                        <span className="underline hover:text-blue-400">
                                            <button
                                                type="button"
                                                onClick={() => setSubmitted(false)}
                                                aria-label="Try another email address button"
                                                className="cursor-pointer"
                                            >
                                                try another email address
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

                                        <div className="card-actions pt-4 flex flex-col gap-4">
                                            <button
                                                type="submit"
                                                onClick={handleForgotPassword}
                                                disabled={loading}
                                                className="btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block"
                                                aria-label="Send reset link button"
                                            >
                                                {
                                                    loading ?
                                                        <div className="surface-color">
                                                            <Loading size="sm" />
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