type StudentProfileForOnboarding = {
  native_language?: string | null;
  total_xp?: number | null;
  current_streak?: number | null;
  longest_streak?: number | null;
};

function hasLearningEvidence(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return false;
  return (
    (profile.total_xp ?? 0) > 0 ||
    (profile.current_streak ?? 0) > 0 ||
    (profile.longest_streak ?? 0) > 0
  );
}

export function requiresStudentOnboarding(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return true;
  if (profile.native_language) return false;
  return !hasLearningEvidence(profile);
}

export function getPostOnboardingStudentDestination(
  profile: StudentProfileForOnboarding | null | undefined,
  firstLessonCompleted: string | null
): "/app" | "/lesson/first" {
  if (hasLearningEvidence(profile)) return "/app";
  return firstLessonCompleted === "true" ? "/app" : "/lesson/first";
}
