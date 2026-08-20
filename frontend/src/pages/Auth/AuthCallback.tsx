import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loading } from "../../components/Loading";

export const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const returnTo = sessionStorage.getItem("returnTo") || "/account";
    sessionStorage.removeItem("returnTo");
    navigate(returnTo, { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <Loading />
    </div>
  );
};