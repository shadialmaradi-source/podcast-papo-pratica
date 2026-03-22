import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function useRoleGuard(requiredRole: "teacher" | "student") {
  const navigate = useNavigate();
  const { user, loading: authLoading, role, roleLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading || roleLoading) return;

    if (!user) {
      navigate(`/auth?role=${requiredRole}`, { replace: true });
      return;
    }

    const userRole = role || "student";

    if (userRole !== requiredRole) {
      navigate(userRole === "teacher" ? "/teacher" : "/app", { replace: true });
    } else {
      setIsAuthorized(true);
    }
  }, [user, authLoading, roleLoading, role, navigate, requiredRole]);

  return { isAuthorized, loading: authLoading || roleLoading };
}
