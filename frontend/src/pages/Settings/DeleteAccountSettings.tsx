import { startTransition, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { deleteCurrentUser } from "../../api/user";
import { useAuth } from "../../contexts/auth";
import { useToast } from "../../contexts/toast";
import { parseApiError } from "../../utils/apiErrors";

const CONFIRMATION_TEXT = "DELETE";

export const DeleteAccountSettings: React.FC = () => {

    const { setUser } = useAuth();
    const { showToast } = useToast();
    const navigate = useNavigate();

    const [open, setOpen] = useState<boolean>(false);
    const [confirmation, setConfirmation] = useState<string>("");
    const [deleting, setDeleting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const confirmed = confirmation === CONFIRMATION_TEXT;

    const openDialog = () => {
        setConfirmation("");
        setError(null);
        setOpen(true);
    };

    const closeDialog = () => {
        if (deleting) return;
        setOpen(false);
    };

    // Escape closes the dialog, like a native one
    useEffect(() => {
        if (!open) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape" && !deleting) setOpen(false);
        };
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, deleting]);

    // -----------------------------
    // Handle Delete Account
    // -----------------------------
    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!confirmed) return;

        setDeleting(true);
        setError(null);

        try {
            await deleteCurrentUser();

            // React Router applies navigation as a transition. Clearing the user
            // in the same transition makes both land in one render - on its own
            // it would render first, and AuthorizedRoute would bounce to /login.
            startTransition(() => {
                navigate("/", { replace: true });
                setUser(null);
            });
            showToast("Your account has been deleted.");
        } catch (err: unknown) {
            const { message } = parseApiError(err, "Failed to delete your account.");
            setError(message ?? "Failed to delete your account.");
            setDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-5 text-color">
            <div className="flex flex-col gap-2 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold primary-color">Delete account</h2>
                <p className="text-[15px] text-gray-500">
                    Permanently delete your account and all of its data. This can't be undone.
                </p>
            </div>

            <div>
                <button
                    type="button"
                    onClick={openDialog}
                    className="btn btn-error text-[15px] surface-color font-medium rounded-lg px-6"
                    aria-label="Delete account button"
                >
                    Delete account
                </button>
            </div>

            {
                open && (
                    <div className="modal modal-open" onClick={closeDialog}>
                        <div
                            className="modal-box flex flex-col gap-5 text-color"
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="delete-account-title"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex flex-col gap-2">
                                <h3 id="delete-account-title" className="text-lg font-semibold">
                                    Delete your account?
                                </h3>
                                <p className="text-[15px] text-gray-600">
                                    This permanently deletes your account and signs you out. It can't be undone.
                                </p>
                            </div>

                            {
                                error && (
                                    <p className="text-error">{error}</p>
                                )
                            }

                            <form className="flex flex-col gap-5" onSubmit={handleDeleteAccount} noValidate>
                                <label className="form-control flex flex-col gap-2">
                                    <span className="text-sm font-medium text-gray-700">
                                        Type <span className="font-semibold">{CONFIRMATION_TEXT}</span> to confirm
                                    </span>
                                    <input
                                        type="text"
                                        className="input input-lg input-bordered w-full text-sm"
                                        name="confirmation"
                                        autoComplete="off"
                                        aria-label="Delete confirmation input"
                                        value={confirmation}
                                        onChange={(e) => setConfirmation(e.target.value)}
                                        disabled={deleting}
                                        autoFocus
                                    />
                                </label>

                                <div className="modal-action mt-0">
                                    <button
                                        type="button"
                                        onClick={closeDialog}
                                        disabled={deleting}
                                        className="btn btn-ghost text-[15px] font-medium rounded-lg"
                                        aria-label="Cancel delete account button"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!confirmed || deleting}
                                        className={`btn btn-error text-[15px] surface-color font-medium rounded-lg px-6 ${!confirmed || deleting ? "opacity-50" : ""}`}
                                        aria-label="Confirm delete account button"
                                    >
                                        Delete account
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div>
    );
};
