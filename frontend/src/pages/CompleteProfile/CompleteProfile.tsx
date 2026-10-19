import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { updateCurrentUserProfile } from "../../api/userProfile";
import { useAuth } from "../../contexts/auth";
import { Loading } from "../../components/Loading";
import usePageTitle from "../../hooks/usePageTitle";
import { parseApiError, type FieldErrors } from "../../utils/apiErrors";

type ProfileField = "name";

export const CompleteProfile: React.FC = () => {

    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Set by AuthCallback: where to continue to afterwards, and a name from Google to prefill
    const state = location.state as { returnTo?: string; suggestedName?: string | null } | null;
    const returnTo = state?.returnTo ?? "/account";

    // -----------------------------
    // Form State
    // -----------------------------
    const [name, setName] = useState<string>(user?.profile.name || state?.suggestedName || "");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});

    // Compared with the saved name, so a prefilled suggestion can be saved as-is
    const unchanged = name.trim() === (user?.profile.name ?? "");

    // -----------------------------
    // Handle Complete Profile
    // -----------------------------
    const handleCompleteProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            const updatedUser = await updateCurrentUserProfile({ name });
            setUser(updatedUser);
            navigate(returnTo, { replace: true });
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError<ProfileField>(err, "Failed to save your profile.");
            setFieldErrors(fieldErrors);
            setError(message ?? Object.values(fieldErrors).join(" "));
        } finally {
            setLoading(false);
        }
    };

    // -----------------------------
    // Handle Skip
    // -----------------------------
    const handleSkip = () => {
        navigate(returnTo, { replace: true });
    };

    usePageTitle("Complete your profile");

    return (
        <section className="flex flex-col items-center justify-center mt-6">
            <div className="w-full max-w-lg">
                <div className="card rounded-lg">
                    <div className="card-body space-y-6 py-0 md:pt-8 md:pb-12 px-0 text-color">
                        <div className="flex flex-col items-start gap-1">
                            <h1 className="text-4xl font-semibold primary-color">Complete your profile</h1>
                            <p className="text-lg mt-2 text-gray-500">Tell us a little about yourself.</p>
                        </div>

                        {
                            error && (
                                <p className="text-error">{error}</p>
                            )
                        }

                        <form className="flex flex-col space-y-5" onSubmit={handleCompleteProfile} noValidate>
                            <label className="form-control">
                                <input
                                    type="text"
                                    placeholder="Name"
                                    className={`input input-lg input-bordered w-full text-sm ${fieldErrors.name ? "input-error" : ""}`}
                                    name="name"
                                    autoComplete="name"
                                    aria-label="Name input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                />
                            </label>

                            <div className="card-actions pt-4 flex flex-col gap-4">
                                <button
                                    type="submit"
                                    disabled={loading || unchanged}
                                    className={`btn btn-lg text-[15px] fastapi-color-bg surface-color font-medium rounded-lg btn-block ${unchanged && !loading ? "opacity-50" : ""}`}
                                    aria-label="Save profile button"
                                >
                                    {
                                        loading ?
                                            <div>
                                                <Loading size="sm" />
                                            </div>
                                            :
                                            <p>Save</p>
                                    }
                                </button>
                            </div>

                            <p className="text-[16px] text-gray-700">
                                <button
                                    type="button"
                                    onClick={handleSkip}
                                    disabled={loading}
                                    className="underline hover:text-blue-400 cursor-pointer"
                                    aria-label="Skip profile button"
                                >
                                    Skip for now
                                </button>
                            </p>
                        </form>
                    </div>
                </div>
            </div>
        </section>
    );
};
