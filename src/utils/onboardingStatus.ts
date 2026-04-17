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
    profile.last_login_date ||
    (profile.selected_language && profile.selected_language !== 'portuguese') ||
    (profile.current_level && profile.current_level !== 'A1')
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

// Map a target language code (e.g. "english") to a native-language code (e.g. "en")
const TARGET_TO_NATIVE_CODE: Record<string, string> = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  italian: 'it',
  german: 'de',
  portuguese: 'pt',
};

function detectBrowserNativeCode(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language?.split('-')[0]?.toLowerCase() || 'en';
}

export type LessonForHydration = {
  language?: string | null;
  translation_language?: string | null;
  cefr_level?: string | null;
};

/**
 * Hydrate a brand-new student's profile from a teacher's lesson metadata so they
 * can skip onboarding entirely when arriving via a share link.
 * Only fills missing fields — never overwrites existing answers.
 */
export async function hydrateProfileFromLesson(
  supabase: { from: (t: string) => any },
  userId: string,
  lesson: LessonForHydration | null | undefined,
): Promise<void> {
  if (!userId || !lesson) return;

  const { data: existing } = await supabase
    .from('profiles')
    .select('native_language, selected_language, current_level')
    .eq('user_id', userId)
    .maybeSingle();

  const targetLang = lesson.language || existing?.selected_language || 'english';
  const nativeFromLesson = lesson.translation_language && lesson.translation_language !== lesson.language
    ? lesson.translation_language
    : null;
  const nativeCode = nativeFromLesson || existing?.native_language || detectBrowserNativeCode();
  const level = lesson.cefr_level || existing?.current_level || 'A1';

  await supabase
    .from('profiles')
    .update({
      selected_language: targetLang,
      native_language: nativeCode,
      current_level: level,
    })
    .eq('user_id', userId);
}

/**
 * Fetch a lesson by share token (public read via RLS) and return only the
 * fields needed to hydrate a student's profile.
 */
export async function fetchLessonForHydration(
  supabase: { from: (t: string) => any },
  shareToken: string,
): Promise<LessonForHydration | null> {
  if (!shareToken) return null;
  const { data } = await supabase
    .from('teacher_lessons')
    .select('language, translation_language, cefr_level')
    .eq('share_token', shareToken)
    .maybeSingle();
  return (data as LessonForHydration) || null;
}

export function extractShareTokenFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const m = path.match(/^\/lesson\/student\/([^/?#]+)/);
  return m?.[1] || null;
}
