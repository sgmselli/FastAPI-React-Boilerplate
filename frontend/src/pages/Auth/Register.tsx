import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Google } from "../../components/Icons/Icons";
import { registerUser } from "../../api/user";
import type { UserCreateRequest } from "../../types/user";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";
import { parseApiError, type FieldErrors } from "../../utils/apiErrors";

type RegisterField = "email" | "password" | "confirm_password";

export const Register: React.FC = () => {
    // -----------------------------
    // Form State
    // -----------------------------
    const [email, setEmail] = useState<string>("");
    const [password, setPassword] = useState<string>("");
    const [confirmPassword, setConfirmPassword] = useState<string>("");
    const [agreedToPolicies, setAgreedToPolicies] = useState<boolean>(false);

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const [fieldErrors, setFieldErrors] = useState<FieldErrors<RegisterField>>({});

    const navigate = useNavigate();

    const buildUserData = (): UserCreateRequest => {
        return {
            email,
            password,
            confirmPassword
        };
    };

    const handleRegister = async () => {
        setLoading(true);
        setError(null);
        setFieldErrors({});
        try {
            await registerUser(buildUserData());
            // The account stays inactive until the emailed code is entered
            navigate("/verify-email", { state: { email } });
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError<RegisterField>(err, "Failed to create account.");
            setError(message);
            setFieldErrors(fieldErrors);
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Handle Google Login
    // -----------------------------
    const handleGoogleRegister= async () => {
        window.location.href = "api/v1/auth/google/login";
    };

    usePageTitle("Create an account");

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">
                        <div className="flex flex-col items-start gap-1">
                            <h1 className="text-4xl font-semibold primary-color">Create an account</h1>
                            <p className="text-lg mt-2 text-gray-500">Create your free account!</p>
                        </div>

                        {
                            error && (
                                <p className="text-error">{error}</p>
                            )
                        }

                        <div className="flex flex-col space-y-5">

                            <button
                                onClick={handleGoogleRegister}
                                disabled={loading}
                                className="btn btn-lg text-[15px] surface-color-bg text-color font-medium rounded-lg border-gray-300 hover:bg-gray-100! btn-block mb-0 flex items-center justify-center gap-4"
                                aria-label="Sign up with Google button"
                            >
                                <Google />
                                Sign up with Google
                            </button>

                            <div className="h-px divider my-6 before:bg-gray-300 after:bg-gray-300 text-gray-400">
                                OR
                            </div>

                            <label className="form-control">
                                <input
                                    type="email"
                                    placeholder="Email"
                                    className={`input input-lg input-bordered w-full text-sm ${fieldErrors.email ? "input-error" : ""}`}
                                    name="email"
                                    autoComplete="email"
                                    aria-label="Register email input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                {fieldErrors.email && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                                )}
                            </label>

                            <label className="form-control">
                                <input
                                    type="password"
                                    placeholder="Password"
                                    className={`input input-lg input-bordered w-full text-sm ${fieldErrors.password ? "input-error" : ""}`}
                                    name="password"
                                    autoComplete="new-password"
                                    aria-label="Register password input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                {fieldErrors.password && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                                )}
                            </label>

                            <label className="form-control">
                                <input
                                    type="password"
                                    placeholder="Confirm password"
                                    className={`input input-lg input-bordered w-full text-sm ${fieldErrors.confirm_password ? "input-error" : ""}`}
                                    name="confirm_password"
                                    autoComplete="new-password"
                                    aria-label="Confirm password input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {fieldErrors.confirm_password && (
                                    <p className="text-red-500 text-sm mt-1">{fieldErrors.confirm_password}</p>
                                )}
                            </label>

                            <label className="flex items-start gap-3 text-[15px] text-gray-700 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="checkbox checkbox-sm mt-0.5"
                                    name="agree_to_policies"
                                    aria-label="Agree to policies checkbox"
                                    checked={agreedToPolicies}
                                    onChange={(e) => setAgreedToPolicies(e.target.checked)}
                                    required
                                />
                                <span>
                                    By registering you agree to our{" "}
                                    {/* New tab, so following a link doesn't lose what's been typed */}
                                    <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">Privacy Policy</Link>
                                    {" "}and{" "}
                                    <Link to="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-400">Terms and Conditions</Link>.
                                </span>
                            </label>

                            <div className="card-actions pt-4 flex flex-col gap-4">
                                <button
                                    type="submit"
                                    onClick={handleRegister}
                                    disabled={loading || !agreedToPolicies}
                                    className={`btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block ${!agreedToPolicies && !loading ? "opacity-50" : ""}`}
                                    aria-label="Create account button"
                                >
                                    {
                                        loading ?
                                            <div>
                                                <Loading size="sm" />
                                            </div>
                                            :
                                            <p>Create account</p>
                                    }
                                </button>
                            </div>

                            <p className="mt-2 text-[16px] text-gray-700">
                                Have an account?{" "}
                                <span className="underline hover:text-blue-400">
                                    <Link to="/login">Sign in</Link>
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};