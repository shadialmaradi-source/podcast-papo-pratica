import { useAuth } from "@/hooks/useAuth";

type AppRole = "teacher" | "student";

interface UseUserRoleResult {
  role: AppRole | null;
  loading: boolean;
}

export function useUserRole(): UseUserRoleResult {
  const { role, roleLoading } = useAuth();
  return { role, loading: roleLoading };
}
