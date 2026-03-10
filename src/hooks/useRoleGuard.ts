import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useRoleGuard(requiredRole: "teacher" | "student") {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(`/auth?role=${requiredRole}`, { replace: true });
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = (data as any)?.role || "student";

      if (userRole !== requiredRole) {
        navigate(userRole === "teacher" ? "/teacher" : "/app", { replace: true });
      } else {
        setIsAuthorized(true);
      }
      setLoading(false);
    };

    checkRole();
  }, [user, authLoading, navigate, requiredRole]);

  return { isAuthorized, loading: authLoading || loading };
}
