import { supabase } from "@/integrations/supabase/client";

interface ResolveTeacherNotificationRouteOptions {
  teacherId: string | undefined;
  studentEmail?: string | null;
}

const TEACHER_STUDENTS_FALLBACK = "/teacher/students";

export async function resolveTeacherNotificationRoute({
  teacherId,
  studentEmail,
}: ResolveTeacherNotificationRouteOptions): Promise<string> {
  if (!teacherId || !studentEmail) return TEACHER_STUDENTS_FALLBACK;

  const normalizedEmail = studentEmail.trim().toLowerCase();
  if (!normalizedEmail) return TEACHER_STUDENTS_FALLBACK;

  try {
    const { data } = await supabase
      .from("teacher_students" as any)
      .select("id")
      .eq("teacher_id", teacherId)
      .ilike("student_email", normalizedEmail)
      .maybeSingle();

    const studentId = (data as { id?: string } | null)?.id;
    if (studentId) return `/teacher/student/${studentId}`;
  } catch (error) {
    console.warn("Failed to resolve notification student route", error);
  }

  return TEACHER_STUDENTS_FALLBACK;
}
