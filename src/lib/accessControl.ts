import { supabase } from "@/integrations/supabase/client";

export type AppRole = "teacher" | "student";
export type AppSection = "teacher" | "student" | "any";

export const ADMIN_OVERRIDE_EMAIL = "shadi.almaradi@gmail.com";

function normalizeEmail(email?: string | null): string {
  return (email || "").trim().toLowerCase();
}

export function isAdminOverrideEmail(email?: string | null): boolean {
  return normalizeEmail(email) === ADMIN_OVERRIDE_EMAIL;
}

export function canAccessSection(section: AppSection, role: AppRole | null, email?: string | null): boolean {
  if (section === "any") return true;
  if (isAdminOverrideEmail(email)) return true;
  return role === section;
}

export function getDefaultHomeForRole(role: AppRole | null, email?: string | null): string {
  if (isAdminOverrideEmail(email)) return "/teacher";
  return role === "teacher" ? "/teacher" : "/app";
}

export async function resolveUserRole(userId: string): Promise<AppRole> {
  const { data: roleData } = await supabase
    .from("user_roles" as any)
    .select("role")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  const userRole = (roleData as any)?.role;
  if (userRole === "teacher" || userRole === "student") {
    return userRole;
  }

  const { data: teacherProfile } = await supabase
    .from("teacher_profiles" as any)
    .select("teacher_id")
    .eq("teacher_id", userId)
    .maybeSingle();

  if (teacherProfile) {
    return "teacher";
  }

  const { data: authUserData } = await supabase.auth.getUser();
  const metadataRole = authUserData.user?.user_metadata?.role || authUserData.user?.app_metadata?.role;
  if (metadataRole === "teacher" || metadataRole === "student") {
    return metadataRole;
  }

  return "student";
}
