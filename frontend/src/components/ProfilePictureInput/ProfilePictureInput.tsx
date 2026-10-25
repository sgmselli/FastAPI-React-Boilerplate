import { useRef, useState } from "react";

import { deleteProfilePicture, uploadProfilePicture } from "../../api/userProfile";
import { useAuth } from "../../contexts/auth";
import { Avatar } from "../Avatar/Avatar";
import { Loading } from "../Loading";
import { parseApiError } from "../../utils/apiErrors";

const ALLOWED_PICTURE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "image/avif"];
// Some browsers report HEIC files with an empty type, so the extension is checked too
const ALLOWED_PICTURE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"];
export const MAX_PICTURE_BYTES = 5 * 1024 * 1024;

const isAllowedPicture = (file: File): boolean =>
    ALLOWED_PICTURE_TYPES.includes(file.type) ||
    ALLOWED_PICTURE_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));

interface ProfilePictureInputProps {
    onUploaded?: () => void;
    onRemoved?: () => void;
}

export const ProfilePictureInput: React.FC<ProfilePictureInputProps> = ({ onUploaded, onRemoved }) => {

    const { user, setUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [uploading, setUploading] = useState<boolean>(false);
    const [removing, setRemoving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const pictureUrl = user?.profile.profile_picture_url ?? null;
    const busy = uploading || removing;

    // -----------------------------
    // Handle Upload
    // -----------------------------
    const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        setError(null);

        if (!isAllowedPicture(file)) {
            setError("Image must be a JPEG, PNG, WebP, HEIC or AVIF.");
            return;
        }
        if (file.size > MAX_PICTURE_BYTES) {
            setError("Image must be 5MB or smaller.");
            return;
        }

        setUploading(true);
        try {
            const updatedUser = await uploadProfilePicture(file);
            setUser(updatedUser);
            onUploaded?.();
        } catch (err: unknown) {
            const { message } = parseApiError(err, "Failed to upload your profile picture.");
            setError(message ?? "Failed to upload your profile picture.");
        } finally {
            setUploading(false);
        }
    };

    // -----------------------------
    // Handle Remove
    // -----------------------------
    const handleRemove = async () => {
        setError(null);
        setRemoving(true);
        try {
            const updatedUser = await deleteProfilePicture();
            setUser(updatedUser);
            onRemoved?.();
        } catch (err: unknown) {
            const { message } = parseApiError(err, "Failed to remove your profile picture.");
            setError(message ?? "Failed to remove your profile picture.");
        } finally {
            setRemoving(false);
        }
    };

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-center gap-5">
                <div className="relative">
                    <Avatar src={pictureUrl} alt="Profile picture" className="h-20 w-20" />
                    {
                        uploading && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                                <Loading size="sm" />
                            </div>
                        )
                    }
                </div>

                <div className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={busy}
                            className="btn btn-sm text-[14px] surface-color-bg text-color font-medium rounded-lg border-gray-300 hover:bg-gray-100!"
                            aria-label="Upload profile picture button"
                        >
                            {pictureUrl ? "Change photo" : "Upload photo"}
                        </button>

                        {
                            pictureUrl && (
                                <button
                                    type="button"
                                    onClick={handleRemove}
                                    disabled={busy}
                                    className="text-[14px] text-gray-600 underline hover:text-red-600 cursor-pointer disabled:opacity-50"
                                    aria-label="Remove profile picture button"
                                >
                                    {removing ? "Removing..." : "Remove"}
                                </button>
                            )
                        }
                    </div>
                    <p className="text-[13px] text-gray-500">JPEG, PNG, WebP, HEIC or AVIF, up to 5MB.</p>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept={[...ALLOWED_PICTURE_TYPES, ...ALLOWED_PICTURE_EXTENSIONS].join(",")}
                    onChange={handleFileSelected}
                    className="hidden"
                    aria-label="Profile picture input"
                />
            </div>

            {
                error && (
                    <p className="text-error text-sm">{error}</p>
                )
            }
        </div>
    );
};
