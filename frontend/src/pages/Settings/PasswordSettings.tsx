import { useState } from "react";

import { requestPasswordReset } from "../../api/forgotPassword";
import { useAuth } from "../../contexts/auth";
import { useToast } from "../../contexts/toast";
import { parseApiError } from "../../utils/apiErrors";

export const PasswordSettings: React.FC = () => {

    const { user } = useAuth();
    const { showToast } = useToast();

    // Disabled as soon as it's clicked and kept that way once the email is
    // sent - only re-enabled if sending fails, so they can try again
    const [sending, setSending] = useState<boolean>(false);
    const [sent, setSent] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

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
            setSent(true);
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
                    disabled={sending || sent}
                    className={`btn text-[15px] fastapi-color-bg surface-color font-medium rounded-lg px-6 ${sending || sent ? "opacity-50" : ""}`}
                    aria-label="Send me a link button"
                >
                    Send me a link
                </button>
            </div>
        </div>
    );
};
