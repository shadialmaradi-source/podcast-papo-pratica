import { supabase } from "@/integrations/supabase/client";

export type AppRole = "teacher" | "student";
export type AppSection = "teacher" | "student" | "any";

// Admin override is enforced server-side only (via edge function env var
// ADMIN_OVERRIDE_EMAIL). The client must never know the privileged email,
// otherwise it leaks the admin identity to anyone inspecting the bundle.
export function isAdminOverrideEmail(_email?: string | null): boolean {
  return false;
}

export function canAccessSection(section: AppSection, role: AppRole | null, _email?: string | null): boolean {
  if (section === "any") return true;
  return role === section;
}

export function getDefaultHomeForRole(role: AppRole | null, _email?: string | null): string {
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
