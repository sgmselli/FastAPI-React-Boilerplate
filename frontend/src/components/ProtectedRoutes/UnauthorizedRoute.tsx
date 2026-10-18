import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../../contexts/auth";
import { Loading } from "../Loading";

export default function UnauthorisedRoute() {
  const { user, loadingUser } = useAuth();

  if (loadingUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/auth/callback" replace />;
  }

  return <Outlet />;
}