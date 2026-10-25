import { useState } from "react";

export const DEFAULT_AVATAR_SRC = "/images/default-avatar.svg";

interface AvatarProps {
    src: string | null;
    alt?: string;
    className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ src, alt = "", className = "h-10 w-10" }) => {

    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    const showDefault = !src || src === failedSrc;

    return (
        <img
            src={showDefault ? DEFAULT_AVATAR_SRC : src}
            alt={alt}
            onError={() => setFailedSrc(src)}
            className={`${className} rounded-full object-cover bg-gray-200 border border-gray-300 flex-shrink-0`}
        />
    );
};
