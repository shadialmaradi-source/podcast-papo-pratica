import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy, Check, ArrowLeft, Share2, Eye, EyeOff, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { trackEvent, trackFunnelStep } from "@/lib/analytics";
import { useTextSelection } from "@/hooks/useTextSelection";
import { TextSelectionPopover } from "@/components/transcript/TextSelectionPopover";
import { WordExplorerPanel } from "@/components/transcript/WordExplorerPanel";
import { FlashcardCreatorModal } from "@/components/transcript/FlashcardCreatorModal";
import { analyzeWord, type WordAnalysis } from "@/services/wordAnalysisService";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { EXERCISE_TYPE_LABELS, TYPE_COLORS } from "@/components/teacher/ExercisePresenter";
import type { Exercise } from "@/components/teacher/ExercisePresenter";

type LessonType = "paragraph" | "youtube";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const LANGUAGES = [
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
] as const;

const TRANSLATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "italian", label: "Italian" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
] as const;

const PARAGRAPH_LENGTHS = [
  { value: "short", label: "Short (~50-80 words)" },
  { value: "medium", label: "Medium (~80-150 words)" },
  { value: "long", label: "Long (~150-250 words)" },
] as const;

const EXERCISE_TYPES_PARAGRAPH = [
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "flashcards", label: "Flashcards" },
] as const;

const EXERCISE_TYPES_YOUTUBE = [
  { id: "fill_in_blank", label: "Fill in the Blank" },
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "role_play", label: "Role-play" },
  { id: "spot_the_mistake", label: "Spot the Mistake" },
] as const;

function extractYouTubeId(url: string): string | null {
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

interface CreateLessonFormProps {
  lessonType: LessonType;
  onCreated: (lessonId: string) => void;
  onCancel: () => void;
  prefillYoutubeUrl?: string;
  maxVideoMinutes?: number;
}

export function CreateLessonForm({ lessonType, onCreated, onCancel, prefillYoutubeUrl, maxVideoMinutes }: CreateLessonFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatingParagraph, setGeneratingParagraph] = useState(false);
  const [paragraphContent, setParagraphContent] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [communityShared, setCommunityShared] = useState(false);
  const [togglingCommunity, setTogglingCommunity] = useState(false);

  useEffect(() => {
    trackEvent("teacher_lesson_creation_started", { type: lessonType });
  }, [lessonType]);

  // Inline result state
  const [createdLessonId, setCreatedLessonId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [lessonTranscript, setLessonTranscript] = useState<string | null>(null);
  const [lessonYoutubeUrl, setLessonYoutubeUrl] = useState<string | null>(null);

  // Per-type generation state
  const [generatingType, setGeneratingType] = useState<string | null>(null);
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>([]);

  // Grouped exercise navigation state
  interface GroupState { currentIndex: number; revealed: boolean; }
  const [groupStates, setGroupStates] = useState<Record<string, GroupState>>({});

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
  const exerciseTypes = isParagraph ? EXERCISE_TYPES_PARAGRAPH : EXERCISE_TYPES_YOUTUBE;

  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      title: "",
      student_email: "",
      cefr_level: "A1",
      exercise_types: [],
      translation_language: "english",
      ...(isParagraph
        ? { paragraph_prompt: "", language: "italian", paragraph_length: "medium" }
        : { topic: "", youtube_url: prefillYoutubeUrl || "", language: "italian" }),
    },
  });

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
    setExploredWord(selection.text);
    setWordExplorerOpen(true);
    setWordLoading(true);
    setWordAnalysis(null);
    clearSelection();
    try {
      const analysis = await analyzeWord(selection.text, language, selection.fullSentence);
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
    setLoading(true);
    try {
      const shareToken = crypto.randomUUID();
      const insertData: any = {
        teacher_id: user.id,
        title: values.title,
        student_email: values.student_email,
        cefr_level: values.cefr_level,
        exercise_types: values.exercise_types,
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

      const link = `${window.location.origin}/lesson/student/${shareToken}`;
      setShareLink(link);
      setCreatedLessonId(data.id);
      setLessonYoutubeUrl(values.youtube_url || null);
      setSelectedExerciseTypes(values.exercise_types);
      toast({ title: "Lesson created!", description: "Click the exercise type buttons below to generate exercises." });
      trackEvent("teacher_lesson_creation_completed", { type: lessonType, language: values.language, cefr_level: values.cefr_level });
      onCreated(data.id);

      // Fetch transcript for YouTube lessons
      if (!isParagraph && values.youtube_url) {
        // Trigger transcript fetch via edge function (it will store it)
        try {
          await supabase.functions.invoke("generate-lesson-exercises-by-type", {
            body: { lessonId: data.id, exerciseType: values.exercise_types[0] }
          });
          // Fetch the exercises + transcript
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
          }
          if (lessonRes.data?.transcript) setLessonTranscript(lessonRes.data.transcript);
          // Mark first type as done
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

      // Re-fetch all exercises
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

      // Fetch transcript if not yet loaded
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

  const handleToggleCommunityShare = useCallback(async (checked: boolean) => {
    if (!createdLessonId || !user) return;
    setTogglingCommunity(true);
    try {
      if (checked) {
        // Fetch teacher name
        const { data: profile } = await supabase
          .from("teacher_profiles" as any)
          .select("full_name")
          .eq("teacher_id", user.id)
          .maybeSingle();

        const teacherName = (profile as any)?.full_name || user.email?.split("@")[0] || "";
        const values = form.getValues();

        await supabase.from("community_lessons" as any).insert({
          source_lesson_id: createdLessonId,
          teacher_id: user.id,
          teacher_name: teacherName,
          title: values.title,
          description: null,
          lesson_type: lessonType,
          language: values.language || "italian",
          translation_language: values.translation_language || "english",
          cefr_level: values.cefr_level,
          topic: values.topic || null,
          exercise_types: values.exercise_types,
        } as any);

        await supabase
          .from("teacher_lessons")
          .update({ is_community_shared: true } as any)
          .eq("id", createdLessonId);

        trackEvent("path_made_public", { lesson_id: createdLessonId });
      } else {
        await supabase
          .from("community_lessons" as any)
          .delete()
          .eq("source_lesson_id", createdLessonId)
          .eq("teacher_id", user.id);

        await supabase
          .from("teacher_lessons")
          .update({ is_community_shared: false } as any)
          .eq("id", createdLessonId);
      }
      setCommunityShared(checked);
    } catch (err: any) {
      console.error("Community share toggle failed:", err);
    } finally {
      setTogglingCommunity(false);
    }
  }, [createdLessonId, user, form, lessonType]);

  const currentLanguage = form.watch("language") || "italian";

  // Group exercises by type
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

  const updateGroupState = (type: string, update: Partial<GroupState>) => {
    setGroupStates((prev) => ({
      ...prev,
      [type]: { ...prev[type], ...update },
    }));
  };

  // ExerciseContent renderer
  const renderExerciseContent = (exercise: Exercise, revealed: boolean) => {
    const c = exercise.content;
    if (exercise.exercise_type === "fill_in_blank") {
      return (
        <div className="space-y-4">
          <p className="text-xl font-medium text-foreground leading-relaxed">{c.sentence}</p>
          {c.hint && <p className="text-sm text-muted-foreground italic">💡 Hint: {c.hint}</p>}
          {revealed && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Answer</p>
              <p className="text-lg font-bold text-primary">{c.answer}</p>
            </div>
          )}
        </div>
      );
    }
    if (exercise.exercise_type === "multiple_choice") {
      return (
        <div className="space-y-4">
          <p className="text-xl font-medium text-foreground">{c.question}</p>
          <ul className="space-y-2">
            {(c.options || []).map((opt: string, i: number) => {
              const letter = ["A", "B", "C", "D"][i];
              const isCorrect = revealed && letter === c.correct;
              return (
                <li key={i} className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${isCorrect ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 text-foreground"}`}>
                  <span className="font-bold mr-2">{letter}.</span>{opt}
                  {isCorrect && <span className="ml-2 text-primary">✓</span>}
                </li>
              );
            })}
          </ul>
          {revealed && c.explanation && <p className="text-sm text-muted-foreground italic">{c.explanation}</p>}
        </div>
      );
    }
    if (exercise.exercise_type === "role_play") {
      return (
        <div className="space-y-4">
          <p className="text-lg font-medium text-foreground">{c.scenario}</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Teacher</p>
              <p className="text-sm text-foreground">{c.teacher_role}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Student</p>
              <p className="text-sm text-foreground">{c.student_role}</p>
            </div>
          </div>
          {c.starter && <p className="text-sm italic text-muted-foreground">🗣 Starter: <span className="text-foreground">"{c.starter}"</span></p>}
          {c.useful_phrases?.length > 0 && revealed && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Useful Phrases</p>
              <div className="flex flex-wrap gap-2">
                {c.useful_phrases.map((p: string, i: number) => (
                  <span key={i} className="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }
    if (exercise.exercise_type === "spot_the_mistake") {
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{c.instruction}</p>
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-destructive mb-1">Find the mistake</p>
            <p className="text-xl text-foreground">{c.sentence}</p>
          </div>
          {revealed && (
            <>
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Correction</p>
                <p className="text-xl font-bold text-primary">{c.corrected}</p>
              </div>
              {c.explanation && <p className="text-sm text-muted-foreground italic">{c.explanation}</p>}
            </>
          )}
        </div>
      );
    }
    return <p className="text-muted-foreground">Unknown exercise type</p>;
  };

  const youtubeVideoId = lessonYoutubeUrl ? extractYouTubeId(lessonYoutubeUrl) : null;

  // Determine which types have been generated
  const generatedTypes = new Set(exercises.map(e => e.exercise_type));

  // If lesson was created, show the inline result
  if (createdLessonId) {
    return (
      <>
        <div className="space-y-6">
          {/* Share Link */}
          {shareLink && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Share2 className="h-4 w-4 text-primary" />
                  Share this lesson with your student
                </div>
                <div className="flex items-center gap-2">
                  <Input value={shareLink} readOnly className="flex-1 text-sm" />
                  <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Share with Community toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="community-share" className="text-sm font-medium text-foreground cursor-pointer">
                Share with Community
              </Label>
              <span className="text-xs text-muted-foreground">
                (Other teachers can discover &amp; copy)
              </span>
            </div>
            <Switch
              id="community-share"
              checked={communityShared}
              onCheckedChange={handleToggleCommunityShare}
              disabled={togglingCommunity}
            />
          </div>


          {youtubeVideoId && (
            <div className="rounded-xl overflow-hidden border border-border bg-black aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson video"
              />
            </div>
          )}

          {/* Transcript with word exploration */}
          {lessonTranscript && (
            <TranscriptViewer
              videoId={createdLessonId}
              transcript={lessonTranscript}
              videoTitle={form.getValues("title") || "Lesson"}
              language={currentLanguage}
              isPremium={true}
              onUpgradeClick={() => {}}
            />
          )}

          {/* Paragraph content for paragraph lessons */}
          {isParagraph && paragraphContent && (
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Select any word or phrase to explore it or save as a flashcard.
                </p>
                <div
                  ref={paragraphRef}
                  className="bg-background rounded-md p-4 text-foreground leading-relaxed whitespace-pre-wrap cursor-text select-text border"
                >
                  {paragraphContent}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Per-type exercise generation buttons */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Generate Exercises</h3>
            <div className="grid grid-cols-2 gap-3">
              {selectedExerciseTypes.map((type) => {
                const label = EXERCISE_TYPE_LABELS[type] || type;
                const colorClass = TYPE_COLORS[type] || "";
                const isGenerated = generatedTypes.has(type);
                const isGenerating = generatingType === type;

                return (
                  <Button
                    key={type}
                    variant={isGenerated ? "outline" : "default"}
                    size="sm"
                    onClick={() => handleGenerateByType(type)}
                    disabled={isGenerating || !!generatingType}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isGenerated ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {label}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Generated exercise sections */}
          {exerciseGroups.map((group) => {
            const state = groupStates[group.type] || { currentIndex: 0, revealed: false };
            const exercise = group.exercises[state.currentIndex];
            if (!exercise) return null;

            const label = EXERCISE_TYPE_LABELS[group.type] || group.type;
            const colorClass = TYPE_COLORS[group.type] || "";
            const isFirst = state.currentIndex === 0;
            const isLast = state.currentIndex === group.exercises.length - 1;

            return (
              <div key={group.type} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                      {label}
                    </span>
                    <span className="text-sm text-muted-foreground font-normal">
                      {state.currentIndex + 1} / {group.exercises.length}
                    </span>
                  </h3>
                </div>

                <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${((state.currentIndex + 1) / group.exercises.length) * 100}%` }}
                  />
                </div>

                <Card className="border border-border shadow-sm">
                  <CardContent className="pt-6 pb-6 px-6 space-y-6">
                    {renderExerciseContent(exercise, state.revealed)}
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between gap-3">
                  <Button variant="outline" size="sm" onClick={() => updateGroupState(group.type, { currentIndex: state.currentIndex - 1, revealed: false })} disabled={isFirst}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => updateGroupState(group.type, { revealed: !state.revealed })} className="flex-1">
                    {state.revealed ? <><EyeOff className="h-4 w-4 mr-2" />Hide Answer</> : <><Eye className="h-4 w-4 mr-2" />Reveal Answer</>}
                  </Button>
                  <Button size="sm" onClick={() => updateGroupState(group.type, { currentIndex: state.currentIndex + 1, revealed: false })} disabled={isLast}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            );
          })}

          <Button variant="outline" onClick={onCancel} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        {selection && (
          <TextSelectionPopover
            selectedText={selection.text}
            position={selection.position}
            onCreateFlashcard={handleCreateFlashcard}
            onExploreWord={handleExploreWord}
            onDismiss={clearSelection}
          />
        )}

        <WordExplorerPanel
          open={wordExplorerOpen}
          onOpenChange={setWordExplorerOpen}
          word={exploredWord}
          language={currentLanguage}
          analysis={wordAnalysis}
          loading={wordLoading}
          onSaveFlashcard={handleSaveFlashcardFromExplorer}
        />

        <FlashcardCreatorModal
          open={flashcardModalOpen}
          onOpenChange={setFlashcardModalOpen}
          selectedText={flashcardText}
          fullSentence={flashcardSentence}
          timestamp=""
          videoId=""
          videoTitle=""
          language={currentLanguage}
          onSuccess={() => {
            toast({ title: "Flashcard saved! ✨" });
          }}
          preloadedAnalysis={
            wordAnalysis
              ? { translation: wordAnalysis.translation, partOfSpeech: wordAnalysis.partOfSpeech }
              : null
          }
        />
      </>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {isParagraph && (
            <>
              <FormField
                control={form.control}
                name="paragraph_prompt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Describe the paragraph you want to generate</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g. Giuseppe arrives in Rio de Janeiro and checks into a hostel for the first time"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cefr_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEFR Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CEFR_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="paragraph_length"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Paragraph Length</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select length" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PARAGRAPH_LENGTHS.map((len) => (
                          <SelectItem key={len.value} value={len.value}>{len.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleGenerateParagraph}
                disabled={generatingParagraph}
              >
                {generatingParagraph ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate Paragraph
              </Button>
              {paragraphContent && (
                <Card className="border-primary/30 bg-primary/5 relative">
                  <CardContent className="pt-4">
                    <FormLabel className="mb-2 block">Generated Paragraph</FormLabel>
                    <p className="text-sm text-muted-foreground mb-2">
                      Select any word or phrase to explore it or save as a flashcard.
                    </p>
                    <div
                      ref={paragraphRef}
                      className="bg-background rounded-md p-4 text-foreground leading-relaxed whitespace-pre-wrap cursor-text select-text border"
                    >
                      {paragraphContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!isParagraph && (
            <>
              <FormField
                control={form.control}
                name="youtube_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://youtube.com/watch?v=... or youtube.com/shorts/..."
                        {...field}
                        readOnly={!!prefillYoutubeUrl}
                        className={prefillYoutubeUrl ? "bg-muted" : ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="topic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Ordering food at a restaurant" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cefr_level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEFR Level</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CEFR_LEVELS.map((level) => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Language</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Lesson Title</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Present Tense Practice" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="student_email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student Email</FormLabel>
                <FormControl>
                  <Input placeholder="student@example.com" type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Translation Language */}
          <FormField
            control={form.control}
            name="translation_language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Translation Language <span className="text-muted-foreground text-xs">(for student hints)</span></FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select translation language" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TRANSLATION_LANGUAGES.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="exercise_types"
            render={() => (
              <FormItem>
                <FormLabel>Exercise Types</FormLabel>
                <div className="grid grid-cols-1 gap-2 mt-1">
                  {exerciseTypes.map((type) => (
                    <FormField
                      key={type.id}
                      control={form.control}
                      name="exercise_types"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(type.id)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                field.onChange(
                                  checked
                                    ? [...current, type.id]
                                    : current.filter((v: string) => v !== type.id)
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal cursor-pointer">{type.label}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Lesson
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Form>

      {selection && (
        <TextSelectionPopover
          selectedText={selection.text}
          position={selection.position}
          onCreateFlashcard={handleCreateFlashcard}
          onExploreWord={handleExploreWord}
          onDismiss={clearSelection}
        />
      )}

      <WordExplorerPanel
        open={wordExplorerOpen}
        onOpenChange={setWordExplorerOpen}
        word={exploredWord}
        language={currentLanguage}
        analysis={wordAnalysis}
        loading={wordLoading}
        onSaveFlashcard={handleSaveFlashcardFromExplorer}
      />

      <FlashcardCreatorModal
        open={flashcardModalOpen}
        onOpenChange={setFlashcardModalOpen}
        selectedText={flashcardText}
        fullSentence={flashcardSentence}
        timestamp=""
        videoId=""
        videoTitle=""
        language={currentLanguage}
        onSuccess={() => {
          toast({ title: "Flashcard saved! ✨" });
        }}
        preloadedAnalysis={
          wordAnalysis
            ? { translation: wordAnalysis.translation, partOfSpeech: wordAnalysis.partOfSpeech }
            : null
        }
      />
    </>
  );
}
