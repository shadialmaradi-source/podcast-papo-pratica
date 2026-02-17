import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type AppRole = "teacher" | "student";

interface UseUserRoleResult {
  role: AppRole | null;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("role")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setRole((data as any).role as AppRole);
      } else {
        setRole("student"); // fallback
      }
      setLoading(false);
    };

    fetchRole();
  }, [user]);

  return { role, loading };
}
