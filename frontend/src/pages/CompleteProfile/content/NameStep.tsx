import { useState } from "react";
import { useLocation } from "react-router-dom";

import { updateCurrentUserProfile } from "../../../api/userProfile";
import { useAuth } from "../../../contexts/auth";
import { parseApiError, type FieldErrors } from "../../../utils/apiErrors";
import { StepButton } from "../StepButton";
import type { CompleteProfileState, CompleteProfileStepProps } from "../steps";

type ProfileField = "first_name" | "last_name";

export const NameStep: React.FC<CompleteProfileStepProps> = ({ actionLabel, onContinue }) => {

    const { user, setUser } = useAuth();
    const state = useLocation().state as CompleteProfileState | null;

    const [firstName, setFirstName] = useState<string>(user?.profile.first_name || state?.suggestedFirstName || "");
    const [lastName, setLastName] = useState<string>(user?.profile.last_name || state?.suggestedLastName || "");

    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors<ProfileField>>({});

    const incomplete = !firstName.trim() || !lastName.trim();
    const unchanged =
        firstName.trim() === (user?.profile.first_name ?? "") &&
        lastName.trim() === (user?.profile.last_name ?? "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Already saved, e.g. after coming back a step
        if (unchanged) {
            onContinue();
            return;
        }

        setLoading(true);
        setError(null);
        setFieldErrors({});

        try {
            const updatedUser = await updateCurrentUserProfile({ first_name: firstName, last_name: lastName });
            setUser(updatedUser);
            onContinue();
        } catch (err: unknown) {
            const { message, fieldErrors } = parseApiError<ProfileField>(err, "Failed to save your name.");
            setFieldErrors(fieldErrors);
            setError(message ?? Object.values(fieldErrors).join("\n"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <form className="flex flex-col space-y-5" onSubmit={handleSubmit} noValidate>
            {
                error && (
                    <p className="text-error whitespace-pre-line">{error}</p>
                )
            }

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="form-control">
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

                <label className="form-control">
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

            <div className="pt-4">
                <StepButton type="submit" label={actionLabel} loading={loading} disabled={incomplete} />
            </div>
        </form>
    );
};
