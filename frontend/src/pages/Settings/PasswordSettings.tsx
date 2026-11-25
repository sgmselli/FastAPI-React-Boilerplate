import { useState } from "react";

import { requestPasswordReset } from "../../api/forgotPassword";
import { useAuth } from "../../contexts/auth";
import { useToast } from "../../contexts/toast";
import useCooldown, { PASSWORD_RESET_COOLDOWN_SECONDS } from "../../hooks/useCooldown";
import { parseApiError } from "../../utils/apiErrors";

export const PasswordSettings: React.FC = () => {

    const { user } = useAuth();
    const { showToast } = useToast();

    // Disabled while sending, then for the backend's cooldown once sent.
    // Re-enabled straight away if sending fails, so they can try again
    const [sending, setSending] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const { secondsLeft: secondsUntilResend, start: startResendCooldown } = useCooldown(PASSWORD_RESET_COOLDOWN_SECONDS);

    const disabled = sending || secondsUntilResend > 0;

    // -----------------------------
    // Handle Change Password
    //
    // Reuses the forgot password flow - the link is sent to the signed in
    // user's own email, so owning the inbox is what authorises the change.
    // -----------------------------
    const handleChangePassword = async () => {
        if (!user) return;

        setSending(true);
        setError(null);

        try {
            await requestPasswordReset({ email: user.email });
            startResendCooldown();
            showToast("We've emailed you a link to change your password.");
        } catch (err: unknown) {
            const { message } = parseApiError(err, "Failed to send the email.");
            setError(message ?? "Failed to send the email.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 text-color">
            <div className="flex flex-col gap-1 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold primary-color">Change Password</h2>
                <p className="text-[15px] text-gray-500">We'll email you a link to choose a new password.</p>
            </div>

            {
                error && (
                    <p className="text-error">{error}</p>
                )
            }

            <div>
                <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={disabled}
                    className={`btn text-[15px] fastapi-color-bg surface-color font-medium rounded-lg px-6 ${disabled ? "opacity-50" : ""}`}
                    aria-label="Send me a link button"
                >
                    {secondsUntilResend > 0 ? `Send another link in ${secondsUntilResend}s` : "Send me a link"}
                </button>
            </div>
        </div>
    );
};
