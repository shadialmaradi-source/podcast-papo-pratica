export type StudentProfileForOnboarding = {
  native_language: string | null;
  selected_language: string | null;
  current_level: string | null;
  total_xp: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  last_login_date: string | null;
};

export function hasExistingProgressEvidence(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return false;

  return Boolean(
    (profile.total_xp ?? 0) > 0 ||
    (profile.current_streak ?? 0) > 0 ||
    (profile.longest_streak ?? 0) > 0 ||
    profile.last_login_date
  );
}

export function requiresOnboarding(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return true;
  if (profile.native_language) return false;
  return !hasExistingProgressEvidence(profile);
}

export function shouldRouteToFirstLesson(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return true;
  const localLessonCompleted = localStorage.getItem('first_lesson_completed') === 'true';
  if (localLessonCompleted) return false;

  return !hasExistingProgressEvidence(profile);
}
