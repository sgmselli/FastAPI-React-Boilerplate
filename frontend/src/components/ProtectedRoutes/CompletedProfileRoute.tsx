import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../../contexts/auth";
import { firstCompleteProfilePath } from "../../pages/CompleteProfile/steps";

// Sits inside AuthorizedRoute, so the user has already loaded
export default function CompletedProfileRoute() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (user && !user.profile.is_profile_completed) {
    return <Navigate to={firstCompleteProfilePath} replace state={{ returnTo: pathname }} />;
  }

  return <Outlet />;
}
