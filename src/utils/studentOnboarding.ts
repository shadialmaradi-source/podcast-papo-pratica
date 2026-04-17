type StudentProfileForOnboarding = {
  native_language?: string | null;
  selected_language?: string | null;
  current_level?: string | null;
  total_xp?: number | null;
  current_streak?: number | null;
  longest_streak?: number | null;
};

function hasProfileCustomization(profile: StudentProfileForOnboarding | null | undefined): boolean {
  if (!profile) return false;
  const hasNonDefaultLanguage = !!profile.selected_language && profile.selected_language !== "portuguese";
  const hasNonDefaultLevel = !!profile.current_level && profile.current_level !== "A1";
  return hasNonDefaultLanguage || hasNonDefaultLevel;
}

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
  if (hasProfileCustomization(profile)) return false;
  return !hasLearningEvidence(profile);
}

export function getPostOnboardingStudentDestination(
  profile: StudentProfileForOnboarding | null | undefined,
  firstLessonCompleted: string | null
): "/app" | "/lesson/first" {
  if (hasLearningEvidence(profile) || hasProfileCustomization(profile)) return "/app";
  return firstLessonCompleted === "true" ? "/app" : "/lesson/first";
}
