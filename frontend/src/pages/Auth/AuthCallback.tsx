import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loading } from "../../components/Loading";
import { useAuth } from "../../contexts/auth";

export const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loadingUser } = useAuth();
  const { hash } = useLocation();

  useEffect(() => {
    // After a Google redirect the session user is still being fetched
    if (loadingUser) return;

    const returnTo = sessionStorage.getItem("returnTo") || "/account";
    sessionStorage.removeItem("returnTo");

    // Offer the optional profile step first, then carry on to where they were going
    if (user && !user.profile.is_profile_completed) {
      // Google sign in sends the name it knows as a suggestion, e.g. #name=Jane%20Doe
      const suggestedName = new URLSearchParams(hash.slice(1)).get("name");
      navigate("/complete-profile", { replace: true, state: { returnTo, suggestedName } });
      return;
    }

    navigate(returnTo, { replace: true });
  }, [navigate, user, loadingUser, hash]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loading />
    </div>
  );
};