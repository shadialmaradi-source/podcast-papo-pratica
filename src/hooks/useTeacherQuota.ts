import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { fetchTeacherQuota, type TeacherQuota } from "@/services/teacherQuotaService";

export function useTeacherQuota() {
  const { user } = useAuth();
  const [quota, setQuota] = useState<TeacherQuota | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const q = await fetchTeacherQuota(user.id);
      setQuota(q);
    } catch (err) {
      console.error("Failed to fetch teacher quota:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { quota, loading, refresh };
}
