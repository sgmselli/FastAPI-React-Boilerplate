import { Link, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/auth";

export const CompleteProfileBanner: React.FC = () => {

    const { user, isAuthenticated, loadingUser } = useAuth();
    const { pathname } = useLocation();

    // Hidden on the complete profile page itself - the user is already there
    if (loadingUser || !isAuthenticated() || !user || user.profile.is_profile_completed || pathname === "/complete-profile") {
        return null;
    }

    return (
        <div className="w-full flex justify-center fastapi-color-bg surface-color py-2 text-sm">
            <p className="w-[90%] sm:w-[70%] max-w-[1200px] text-center">
                Please complete your profile.{" "}
                <Link
                    to="/complete-profile"
                    state={{ returnTo: pathname }}
                    className="underline font-medium"
                >
                    Complete profile
                </Link>
            </p>
        </div>
    );
};
