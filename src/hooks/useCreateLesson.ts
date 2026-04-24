import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTextSelection } from "@/hooks/useTextSelection";
import { analyzeWord, type WordAnalysis } from "@/services/wordAnalysisService";
import { trackEvent } from "@/lib/analytics";
import type { Exercise } from "@/components/teacher/ExercisePresenter";
import { EXERCISE_TYPE_LABELS } from "@/components/teacher/ExercisePresenter";
import { buildStudentLessonShareLink } from "@/utils/lessonShare";

export type LessonType = "paragraph" | "youtube";

export const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

export const LANGUAGES = [
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
] as const;

export const TRANSLATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "italian", label: "Italian" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
] as const;

export const PARAGRAPH_LENGTHS = [
  { value: "short", label: "Short (~50-80 words)" },
  { value: "medium", label: "Medium (~80-150 words)" },
  { value: "long", label: "Long (~150-250 words)" },
] as const;

export const EXERCISE_TYPES_YOUTUBE = [
  { id: "fill_in_blank", label: "Fill in the Blank" },
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "role_play", label: "Role-play" },
  { id: "spot_the_mistake", label: "Spot the Mistake" },
] as const;

export const EXERCISE_TYPES_PARAGRAPH = EXERCISE_TYPES_YOUTUBE;

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

const baseSchema = {
  title: z.string().min(3, "Title must be at least 3 characters"),
  student_email: z.string().email("Enter a valid student email"),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  exercise_types: z.array(z.string()).min(1, "Select at least one exercise type"),
  translation_language: z.string().min(1, "Select a translation language"),
};

const paragraphSchema = z.object({
  ...baseSchema,
  paragraph_prompt: z.string().min(10, "Describe the paragraph in at least 10 characters"),
  language: z.string().min(1, "Select a language"),
  paragraph_length: z.string().min(1, "Select a length"),
});

const youtubeSchema = z.object({
  ...baseSchema,
  topic: z.string().optional(),
  youtube_url: z.string().min(1, "Enter a YouTube URL").refine(
    (val) => extractYouTubeId(val) !== null,
    "Enter a valid YouTube URL"
  ),
  language: z.string().min(1, "Select a language"),
});

export interface GroupState {
  currentIndex: number;
  revealed: boolean;
}


const DIFFICULTY_TO_CEFR: Record<string, string> = {
  beginner: "A1",
  intermediate: "B1",
  advanced: "C1",
  a1: "A1",
  a2: "A2",
  b1: "B1",
  b2: "B2",
  c1: "C1",
  c2: "C2",
};

interface UseCreateLessonOptions {
  lessonType: LessonType;
  onCreated: (lessonId: string) => void;
  prefillYoutubeUrl?: string;
  prefillYoutubeTitle?: string;
  prefillYoutubeLanguage?: string;
  prefillYoutubeDifficulty?: string;
  prefillYoutubeCategory?: string | null;
}
function normalizeCategoryTopic(category?: string | null): string {
  if (!category) return "";
  const normalized = category.trim().toLowerCase();
  if (!normalized || ["general", "misc", "other", "unknown"].includes(normalized)) return "";
  return category.trim();
}

function getSmartDefaultTranslationLanguage(sourceLanguage?: string): string {
  const fallback = "english";
  if (!sourceLanguage) return fallback;
  const normalized = sourceLanguage.toLowerCase();
  if (normalized !== fallback) return fallback;
  const firstDifferent = TRANSLATION_LANGUAGES.find((lang) => lang.value !== normalized);
  return firstDifferent?.value || fallback;
}

export function useCreateLesson({
  lessonType,
  onCreated,
  prefillYoutubeUrl,
  prefillYoutubeTitle,
  prefillYoutubeLanguage,
  prefillYoutubeDifficulty,
  prefillYoutubeCategory,
}: UseCreateLessonOptions) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingParagraph, setGeneratingParagraph] = useState(false);
  const [paragraphContent, setParagraphContent] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Inline result state
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lessonTranscript, setLessonTranscript] = useState<string | null>(null);
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState<string | null>(null);

  // Per-type generation state
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>([]);

  // Grouped exercise navigation state
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({});
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const activeGroupRef = useRef<HTMLDivElement>(null);

  // Word explorer state
  const paragraphRef = useRef<HTMLDivElement>(null);
  const { selection, clearSelection } = useTextSelection(paragraphRef);
  const [wordExplorerOpen, setWordExplorerOpen] = useState(false);
  const [wordAnalysis, setWordAnalysis] = useState<WordAnalysis | null>(null);
  const [wordLoading, setWordLoading] = useState(false);
  const [exploredWord, setExploredWord] = useState("");
  const [flashcardModalOpen, setFlashcardModalOpen] = useState(false);
  const [flashcardText, setFlashcardText] = useState("");
  const [flashcardSentence, setFlashcardSentence] = useState("");

  const isParagraph = lessonType === "paragraph";
  const schema = isParagraph ? paragraphSchema : youtubeSchema;
  const exerciseTypeOptions = isParagraph ? EXERCISE_TYPES_PARAGRAPH : EXERCISE_TYPES_YOUTUBE;
  const paragraphDraftKey = isParagraph && user ? `teacher_paragraph_lesson_draft:${user.id}` : null;

const defaultYoutubeLanguage = prefillYoutubeLanguage?.toLowerCase() || "italian";
const defaultYoutubeCefr =
  (prefillYoutubeDifficulty
    ? DIFFICULTY_TO_CEFR[prefillYoutubeDifficulty.toLowerCase()]
    : null) || "A1";
const defaultTranslation = getSmartDefaultTranslationLanguage(defaultYoutubeLanguage);

const form = useForm<any>({
  resolver: zodResolver(schema as any),
  defaultValues: {
    title: prefillYoutubeTitle || "",
    student_email: "",
    cefr_level: defaultYoutubeCefr,
    exercise_types: [],
    translation_language: defaultTranslation,
    ...(isParagraph
      ? { paragraph_prompt: "", language: "english", paragraph_length: "medium" }
      : {
          topic: normalizeCategoryTopic(prefillYoutubeCategory),
          youtube_url: prefillYoutubeUrl || "",
          language: defaultYoutubeLanguage,
        }),
  },
});
  useEffect(() => {
    trackEvent("teacher_lesson_creation_started", { type: lessonType });
    const checkAccess = async () => {
      const { data: { user: freshUser } } = await supabase.auth.getUser();
      setEmailVerified(!!freshUser?.email_confirmed_at);
      if (user) {
        const { data: sub } = await supabase
          .from("teacher_subscriptions" as any)
          .select("plan, status, trial_ends_at")
          .eq("teacher_id", user.id)
          .maybeSingle();
        const plan = (sub as any)?.plan || "free";
        if (plan === "trial" && (sub as any)?.trial_ends_at) {
          const trialEnd = new Date((sub as any).trial_ends_at);
          if (trialEnd < new Date()) setTrialExpired(true);
        }
      }
    };
    checkAccess();
  }, [lessonType, user]);


  useEffect(() => {
    if (!paragraphDraftKey || !isParagraph) return;

    try {
      const raw = sessionStorage.getItem(paragraphDraftKey);
      if (!raw) return;
      const draft = JSON.parse(raw);

      form.reset({
        ...form.getValues(),
        title: draft.title ?? "",
        student_email: draft.student_email ?? "",
        cefr_level: draft.cefr_level ?? "A1",
        exercise_types: Array.isArray(draft.exercise_types)
          ? draft.exercise_types.filter((type: string) => type !== "flashcards")
          : [],
        translation_language: draft.translation_language ?? "english",
        paragraph_prompt: draft.paragraph_prompt ?? "",
        language: draft.language ?? "italian",
        paragraph_length: draft.paragraph_length ?? "medium",
      });

      if (draft.paragraph_content) {
        setParagraphContent(draft.paragraph_content);
      }
    } catch (err) {
      console.error("Failed to restore paragraph lesson draft:", err);
    }
  }, [form, isParagraph, paragraphDraftKey]);

  useEffect(() => {
    if (!paragraphDraftKey || !isParagraph || createdLessonId) return;

    const saveDraft = (values: any) => {
      const draftPayload = {
        title: values.title || "",
        student_email: values.student_email || "",
        cefr_level: values.cefr_level || "A1",
        exercise_types: values.exercise_types || [],
        translation_language: values.translation_language || "english",
        paragraph_prompt: values.paragraph_prompt || "",
        language: values.language || "italian",
        paragraph_length: values.paragraph_length || "medium",
        paragraph_content: paragraphContent || "",
      };
      sessionStorage.setItem(paragraphDraftKey, JSON.stringify(draftPayload));
    };

    saveDraft(form.getValues());
    const subscription = form.watch((values) => saveDraft(values));

    return () => subscription.unsubscribe();
  }, [createdLessonId, form, isParagraph, paragraphContent, paragraphDraftKey]);

  const clearParagraphDraft = () => {
    if (!paragraphDraftKey) return;
    sessionStorage.removeItem(paragraphDraftKey);
  };

  useEffect(() => {
    if (isParagraph || !prefillYoutubeUrl) return;

    const mappedCefr = prefillYoutubeDifficulty ? DIFFICULTY_TO_CEFR[prefillYoutubeDifficulty.toLowerCase()] : null;
    const sourceLanguage = prefillYoutubeLanguage?.toLowerCase();
    const smartTranslation = getSmartDefaultTranslationLanguage(sourceLanguage);
    const normalizedTopic = normalizeCategoryTopic(prefillYoutubeCategory);

    form.reset({
      ...form.getValues(),
      youtube_url: prefillYoutubeUrl,
      title: prefillYoutubeTitle || form.getValues("title") || "",
      topic: normalizedTopic || "",
      language: sourceLanguage || form.getValues("language") || "italian",
      cefr_level: (mappedCefr as any) || form.getValues("cefr_level") || "A1",
      translation_language: smartTranslation,
    });
  }, [
    form,
    isParagraph,
    prefillYoutubeUrl,
    prefillYoutubeTitle,
    prefillYoutubeLanguage,
    prefillYoutubeDifficulty,
    prefillYoutubeCategory,
  ]);

  const handleGenerateParagraph = async () => {
    const prompt = form.getValues("paragraph_prompt");
    const cefrLevel = form.getValues("cefr_level");
    const language = form.getValues("language");
    const paragraphLength = form.getValues("paragraph_length");
    if (!prompt || prompt.length < 10) {
      toast({ title: "Prompt too short", description: "Describe the paragraph in at least 10 characters.", variant: "destructive" });
      return;
    }
    setGeneratingParagraph(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-paragraph", {
        body: { prompt, cefrLevel, language, paragraphLength },
      });
      if (error) throw error;
      setParagraphContent(data.paragraph);
      if (data.suggestedTitle && !form.getValues("title")) {
        form.setValue("title", data.suggestedTitle);
      }
      toast({ title: "Paragraph generated!" });
    } catch (err: any) {
      toast({ title: "Error generating paragraph", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingParagraph(false);
    }
  };

  const handleExploreWord = async () => {
    if (!selection) return;
    const language = form.getValues("language") || "italian";
    const translationLanguage = form.getValues("translation_language") || "english";
    setExploredWord(selection.text);
    setWordExplorerOpen(true);
    setWordLoading(true);
    setWordAnalysis(null);
    clearSelection();
    try {
      const analysis = await analyzeWord(selection.text, language, selection.fullSentence, translationLanguage);
      setWordAnalysis(analysis);
    } catch (err) {
      console.error("Word analysis failed:", err);
    } finally {
      setWordLoading(false);
    }
  };

  const handleCreateFlashcard = () => {
    if (!selection) return;
    setFlashcardText(selection.text);
    setFlashcardSentence(selection.fullSentence);
    setFlashcardModalOpen(true);
    clearSelection();
  };

  const handleSaveFlashcardFromExplorer = () => {
    setFlashcardText(exploredWord);
    setFlashcardSentence(wordAnalysis?.exampleSentence || "");
    setWordExplorerOpen(false);
    setFlashcardModalOpen(true);
  };

  const onSubmit = async (values: any) => {
    if (!user) return;
    if (isParagraph && !paragraphContent) {
      toast({ title: "Generate a paragraph first", variant: "destructive" });
      return;
    }
    const normalizedStudentEmail = values.student_email?.trim().toLowerCase() || null;

    const sanitizedExerciseTypes = isParagraph
      ? (values.exercise_types || []).filter((type: string) => type !== "flashcards")
      : values.exercise_types;
    const resolvedExerciseTypes = sanitizedExerciseTypes.length > 0
      ? sanitizedExerciseTypes
      : ["multiple_choice"];

    setLoading(true);
    try {
      if (!isParagraph && values.youtube_url) {
        const { data: transcriptProbe, error: transcriptProbeError } = await supabase.functions.invoke(
          "extract-youtube-transcript",
          { body: { videoUrl: values.youtube_url, teacherId: user.id, language: values.language || 'italian' } }
        );

        const transcriptProbeMessage = transcriptProbeError?.message || transcriptProbe?.error || "";
        if (transcriptProbeMessage.includes("VIDEO_TOO_LONG")) {
          const cleanMsg = transcriptProbeMessage.split("VIDEO_TOO_LONG:")[1] || "This video exceeds your plan's duration limit.";
          toast({ title: "Video Too Long", description: cleanMsg, variant: "destructive" });
          return;
        }
      }

      const shareToken = crypto.randomUUID();
      const insertData: any = {
        teacher_id: user.id,
        title: values.title,
        student_email: normalizedStudentEmail,
        cefr_level: values.cefr_level,
        exercise_types: resolvedExerciseTypes,
        status: "draft",
        lesson_type: lessonType,
        share_token: shareToken,
        language: values.language || "italian",
        translation_language: values.translation_language || "english",
      };

      if (isParagraph) {
        insertData.paragraph_prompt = values.paragraph_prompt;
        insertData.paragraph_content = paragraphContent;
      } else {
        insertData.topic = values.topic || null;
        insertData.youtube_url = values.youtube_url;
      }

      const { data, error } = await supabase
        .from("teacher_lessons")
        .insert(insertData as any)
        .select("id")
        .single();

      if (error) throw error;

      if (normalizedStudentEmail) {
        await supabase
          .from("teacher_students" as any)
          .upsert({
            teacher_id: user.id,
            student_email: normalizedStudentEmail,
            status: "invited",
          } as any, { onConflict: "teacher_id,student_email", ignoreDuplicates: true });
      }

      const link = buildStudentLessonShareLink(shareToken);
      setShareLink(link);
      setCreatedLessonId(data.id);
      setLessonYoutubeUrl(values.youtube_url || null);
      setSelectedExerciseTypes(resolvedExerciseTypes);
      toast({ title: "Lesson created!", description: "Click the exercise type buttons below to generate exercises." });
      trackEvent("teacher_lesson_creation_completed", { type: lessonType, language: values.language, cefr_level: values.cefr_level });
      clearParagraphDraft();
      onCreated(data.id);

      if (!isParagraph && values.youtube_url) {
        try {
          await supabase.functions.invoke("generate-lesson-exercises-by-type", {
            body: { lessonId: data.id, exerciseType: resolvedExerciseTypes[0] }
          });
          const [exRes, lessonRes] = await Promise.all([
            supabase.from("lesson_exercises").select("*").eq("lesson_id", data.id).order("order_index"),
            supabase.from("teacher_lessons").select("transcript").eq("id", data.id).single()
          ]);
          if (exRes.data) {
            setExercises(exRes.data as Exercise[]);
            const groups: Record<string, Exercise[]> = {};
            for (const ex of exRes.data as Exercise[]) {
              if (!groups[ex.exercise_type]) groups[ex.exercise_type] = [];
              groups[ex.exercise_type].push(ex);
            }
            const initStates: Record<string, GroupState> = {};
            Object.keys(groups).forEach((t) => { initStates[t] = { currentIndex: 0, revealed: false }; });
            setGroupStates(initStates);
            const firstType = Object.keys(groups)[0];
            if (firstType) setActiveGroup(firstType);
          }
          if (lessonRes.data?.transcript) setLessonTranscript(lessonRes.data.transcript);
          setGeneratingType(null);
        } catch (err: any) {
          console.error("First exercise generation error:", err);
        }
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("LESSON_LIMIT_REACHED")) {
        const cleanMsg = msg.split("LESSON_LIMIT_REACHED:")[1] || "You've reached your lesson limit.";
        trackEvent("lesson_limit_reached", { source: "create_lesson_form" });
        toast({ title: "Lesson Limit Reached", description: `${cleanMsg} Upgrade your plan for more lessons.`, variant: "destructive" });
      } else {
        toast({ title: "Error", description: msg, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateByType = async (exerciseType: string) => {
    if (!createdLessonId || generatingType) return;
    setGeneratingType(exerciseType);
    try {
      const { error } = await supabase.functions.invoke("generate-lesson-exercises-by-type", {
        body: { lessonId: createdLessonId, exerciseType }
      });
      if (error) throw error;

      const { data: fetchedExercises } = await supabase
        .from("lesson_exercises")
        .select("*")
        .eq("lesson_id", createdLessonId)
        .order("order_index");

      if (fetchedExercises) {
        setExercises(fetchedExercises as Exercise[]);
        const groups: Record<string, Exercise[]> = {};
        for (const ex of fetchedExercises as Exercise[]) {
          if (!groups[ex.exercise_type]) groups[ex.exercise_type] = [];
          groups[ex.exercise_type].push(ex);
        }
        const newStates: Record<string, GroupState> = { ...groupStates };
        Object.keys(groups).forEach((t) => {
          if (!newStates[t]) newStates[t] = { currentIndex: 0, revealed: false };
        });
        setGroupStates(newStates);
      }

      setActiveGroup(exerciseType);
      setTimeout(() => activeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

      if (!lessonTranscript) {
        const { data: lessonData } = await supabase
          .from("teacher_lessons")
          .select("transcript")
          .eq("id", createdLessonId)
          .single();
        if (lessonData?.transcript) setLessonTranscript(lessonData.transcript);
      }

      toast({ title: `${EXERCISE_TYPE_LABELS[exerciseType] || exerciseType} exercises generated!` });
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || "";
      if (msg.includes("VIDEO_TOO_LONG")) {
        const cleanMsg = msg.split("VIDEO_TOO_LONG:")[1] || "This video exceeds your plan's duration limit.";
        trackEvent("video_length_exceeded", { source: "create_lesson_exercises" });
        toast({ title: "Video Too Long", description: cleanMsg, variant: "destructive" });
      } else {
        toast({ title: "Generation failed", description: msg, variant: "destructive" });
      }
    } finally {
      setGeneratingType(null);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const currentLanguage = form.watch("language") || "italian";
  const currentTranslationLanguage = form.watch("translation_language") || "english";

  const exerciseGroups = useMemo(() => {
    const typeOrder: string[] = [];
    const grouped: Record<string, Exercise[]> = {};
    for (const ex of exercises) {
      if (!grouped[ex.exercise_type]) {
        grouped[ex.exercise_type] = [];
        typeOrder.push(ex.exercise_type);
      }
      grouped[ex.exercise_type].push(ex);
    }
    return typeOrder.map((type) => ({ type, exercises: grouped[type] }));
  }, [exercises]);

  const generatedTypes = new Set(exercises.map(e => e.exercise_type));

  const updateGroupState = (type: string, update: Partial<GroupState>) => {
    setGroupStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...update },
    }));
  };

  const handleResendVerification = async () => {
    const { error } = await supabase.auth.resend({ type: 'signup', email: user?.email || '' });
    if (!error) {
      trackEvent("email_verification_resent", { source: "create_lesson_form" });
      toast({ title: "Verification email sent!", description: "Check your inbox." });
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return {
    // State
    form,
    isParagraph,
    exerciseTypeOptions,
    emailVerified,
    trialExpired,
    loading,
    generatingParagraph,
    paragraphContent,
    shareLink,
    copied,
    createdLessonId,
    exercises,
    lessonTranscript,
    lessonYoutubeUrl,
    generatingType,
    selectedExerciseTypes,
    groupStates,
    activeGroup,
    activeGroupRef,
    paragraphRef,
    selection,
    wordExplorerOpen,
    wordAnalysis,
    wordLoading,
    exploredWord,
    flashcardModalOpen,
    flashcardText,
    flashcardSentence,
    currentLanguage,
    currentTranslationLanguage,
    exerciseGroups,
    generatedTypes,
    user,
    toast,
    // Setters
    setWordExplorerOpen,
    setFlashcardModalOpen,
    setActiveGroup,
    // Handlers
    handleGenerateParagraph,
    handleExploreWord,
    handleCreateFlashcard,
    handleSaveFlashcardFromExplorer,
    onSubmit,
    handleGenerateByType,
    handleCopyLink,
    updateGroupState,
    handleResendVerification,
    clearSelection,
    clearParagraphDraft,
  };
}
