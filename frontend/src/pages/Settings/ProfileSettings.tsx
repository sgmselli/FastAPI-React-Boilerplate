import { useState } from "react";

import { updateCurrentUser } from "../../api/user";
import { useAuth } from "../../contexts/auth";
import { useToast } from "../../contexts/toast";
import { Loading } from "../../components/Loading";
import { parseApiError, type FieldErrors } from "../../utils/apiErrors";

type ProfileField = "name";

export const ProfileSettings: React.FC = () => {

    const { user, setUser } = useAuth();
    const { showToast } = useToast();

    // -----------------------------
    // Form State
    // -----------------------------
    const [name, setName] = useState<string>(user?.name ?? "");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});

    const unchanged = name.trim() === (user?.name ?? "");

    // -----------------------------
    // Handle Update Profile
    // -----------------------------
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            const updatedUser = await updateCurrentUser({ name });
            // Keep the session's copy in sync so the navbar shows the new name
            setUser(updatedUser);
            setName(updatedUser.name);
            showToast("Your profile has been updated.");
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError<ProfileField>(err, "Failed to update profile.");
            setFieldErrors(fieldErrors);
            setError(message ?? Object.values(fieldErrors).join(" "));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 text-color">
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold primary-color">Profile</h2>
                <p className="text-[15px] text-gray-500">Update how your name appears across the app.</p>
            </div>

            {
                error && (
                    <p className="text-error">{error}</p>
                )
            }

            <form className="flex flex-col space-y-5" onSubmit={handleUpdateProfile} noValidate>
                {/* Shown for reference only - email can't be changed */}
                <label className="form-control flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Email</span>
                    <input
                        type="email"
                        className="input input-lg input-bordered w-full text-sm"
                        name="email"
                        aria-label="Email input"
                        value={user?.email ?? ""}
                        disabled
                    />
                </label>

                <label className="form-control flex flex-col gap-2">
                    <span className="text-sm font-medium text-gray-700">Name</span>
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

                <div>
                    <button
                        type="submit"
                        disabled={loading || unchanged}
                        className={`btn text-[15px] fastapi-color-bg surface-color font-medium rounded-lg px-6 ${unchanged && !loading ? "opacity-50" : ""}`}
                        aria-label="Save profile button"
                    >
                        {
                            loading ?
                                <div className="surface-color">
                                    <Loading size="sm" />
                                </div>
                            :
                                <p>Save</p>
                        }
                    </button>
                </div>
            </form>
        </div>
    );
};
