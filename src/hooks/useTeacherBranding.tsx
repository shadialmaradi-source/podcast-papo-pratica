import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TeacherBranding {
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  show_powered_by?: boolean;
}

export function useTeacherBranding(teacherId: string | null) {
  const [branding, setBranding] = useState<TeacherBranding | null>(null);
  const [teacherName, setTeacherName] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teacherId) return;
    setLoading(true);

    supabase
      .from("teacher_profiles" as any)
      .select("branding, full_name")
      .eq("teacher_id", teacherId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setBranding(d.branding ?? null);
          setTeacherName(d.full_name ?? "");
        }
        setLoading(false);
      });
  }, [teacherId]);

  return { branding, teacherName, loading };
}
