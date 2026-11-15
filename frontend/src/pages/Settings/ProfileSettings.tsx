import { useState } from "react";

import { updateCurrentUserProfile } from "../../api/userProfile";
import { useAuth } from "../../contexts/auth";
import { useToast } from "../../contexts/toast";
import { Loading } from "../../components/Loading";
import { ProfilePictureInput } from "../../components/ProfilePictureInput/ProfilePictureInput";
import { parseApiError, type FieldErrors } from "../../utils/apiErrors";

type ProfileField = "first_name" | "last_name";

export const ProfileSettings: React.FC = () => {

    const { user, setUser } = useAuth();
    const { showToast } = useToast();

    // -----------------------------
    // Form State
    // -----------------------------
    const [firstName, setFirstName] = useState<string>(user?.profile.first_name ?? "");
    const [lastName, setLastName] = useState<string>(user?.profile.last_name ?? "");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});

    const unchanged =
        firstName.trim() === (user?.profile.first_name ?? "") &&
        lastName.trim() === (user?.profile.last_name ?? "");

    // -----------------------------
    // Handle Update Profile
    // -----------------------------
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            const updatedUser = await updateCurrentUserProfile({ first_name: firstName, last_name: lastName });
            // Keep the session's copy in sync so the navbar shows the new name
            setUser(updatedUser);
            setFirstName(updatedUser.profile.first_name ?? "");
            setLastName(updatedUser.profile.last_name ?? "");
            showToast("Your profile has been updated.");
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError<ProfileField>(err, "Failed to update profile.");
            setFieldErrors(fieldErrors);
            setError(message ?? Object.values(fieldErrors).join("\n"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 text-color">
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold primary-color">Profile</h2>
                <p className="text-[15px] text-gray-500">Update how your name and picture appear across the app.</p>
            </div>

            <ProfilePictureInput
                onUploaded={() => showToast("Your profile picture has been updated.")}
                onRemoved={() => showToast("Your profile picture has been removed.")}
            />

            {
                error && (
                    <p className="text-error whitespace-pre-line">{error}</p>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label className="form-control flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">First name</span>
                        <input
                            type="text"
                            placeholder="First name"
                            className={`input input-lg input-bordered w-full text-sm ${fieldErrors.first_name ? "input-error" : ""}`}
                            name="first_name"
                            autoComplete="given-name"
                            aria-label="First name input"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            required
                        />
                    </label>

                    <label className="form-control flex flex-col gap-2">
                        <span className="text-sm font-medium text-gray-700">Last name</span>
                        <input
                            type="text"
                            placeholder="Last name"
                            className={`input input-lg input-bordered w-full text-sm ${fieldErrors.last_name ? "input-error" : ""}`}
                            name="last_name"
                            autoComplete="family-name"
                            aria-label="Last name input"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            required
                        />
                    </label>
                </div>

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
                                    <Loading size="sm" className="surface-color" />
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
