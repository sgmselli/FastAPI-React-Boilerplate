import { useEffect, useState } from "react";

import { Google } from "../Icons/Icons";
import { Loading } from "../Loading";

export const GOOGLE_LOGIN_URL = "api/v1/auth/google/login";

interface GoogleAuthButtonProps {
    label: string;
    disabled?: boolean;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({ label, disabled = false }) => {

    const [redirecting, setRedirecting] = useState<boolean>(false);

    // Coming back with the browser's back button can restore the page as it
    // was left, spinner and all
    useEffect(() => {
        const handlePageShow = (event: PageTransitionEvent) => {
            if (event.persisted) setRedirecting(false);
        };
        window.addEventListener("pageshow", handlePageShow);
        return () => window.removeEventListener("pageshow", handlePageShow);
    }, []);

    const handleClick = () => {
        setRedirecting(true);
        window.location.href = GOOGLE_LOGIN_URL;
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled || redirecting}
            className="btn btn-lg text-[15px] surface-color-bg text-color font-medium rounded-lg border-gray-300 hover:bg-gray-100! btn-block mb-0 flex items-center justify-center gap-4"
            aria-label={`${label} button`}
        >
            {
                redirecting ? (
                    <Loading size="sm" />
                ) : (
                    <>
                        <Google />
                        {label}
                    </>
                )
            }
        </button>
    );
};
