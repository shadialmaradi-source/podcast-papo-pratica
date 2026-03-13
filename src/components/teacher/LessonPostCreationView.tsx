import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Sparkles, Copy, Check, ArrowLeft, Share2, Eye, EyeOff, ChevronLeft, ChevronRight } from "lucide-react";
import { TextSelectionPopover } from "@/components/transcript/TextSelectionPopover";
import { WordExplorerPanel } from "@/components/transcript/WordExplorerPanel";
import { FlashcardCreatorModal } from "@/components/transcript/FlashcardCreatorModal";
import { TranscriptViewer } from "@/components/transcript/TranscriptViewer";
import { EXERCISE_TYPE_LABELS, TYPE_COLORS } from "@/components/teacher/ExercisePresenter";
import type { Exercise } from "@/components/teacher/ExercisePresenter";
import { extractYouTubeId, type GroupState } from "@/hooks/useCreateLesson";
import type { UseFormReturn } from "react-hook-form";
import type { WordAnalysis } from "@/services/wordAnalysisService";
import { RefObject } from "react";

interface LessonPostCreationViewProps {
  shareLink: string | null;
  copied: boolean;
  onCopyLink: () => void;
  lessonYoutubeUrl: string | null;
  lessonTranscript: string | null;
  createdLessonId: string;
  form: UseFormReturn<any>;
  currentLanguage: string;
  isParagraph: boolean;
  paragraphContent: string;
  paragraphRef: RefObject<HTMLDivElement>;
  selectedExerciseTypes: string[];
  generatedTypes: Set<string>;
  generatingType: string | null;
  onGenerateByType: (type: string) => void;
  exerciseGroups: { type: string; exercises: Exercise[] }[];
  groupStates: Record<string, GroupState>;
  activeGroup: string | null;
  activeGroupRef: RefObject<HTMLDivElement>;
  onUpdateGroupState: (type: string, update: Partial<GroupState>) => void;
  onSetActiveGroup: (type: string) => void;
  onCancel: () => void;
  // Word explorer
  selection: { text: string; position: { x: number; y: number }; fullSentence: string } | null;
  onCreateFlashcard: () => void;
  onExploreWord: () => void;
  onDismissSelection: () => void;
  wordExplorerOpen: boolean;
  onWordExplorerOpenChange: (open: boolean) => void;
  exploredWord: string;
  wordAnalysis: WordAnalysis | null;
  wordLoading: boolean;
  onSaveFlashcardFromExplorer: () => void;
  flashcardModalOpen: boolean;
  onFlashcardModalOpenChange: (open: boolean) => void;
  flashcardText: string;
  flashcardSentence: string;
  onFlashcardSuccess: () => void;
}

function renderExerciseContent(exercise: Exercise, revealed: boolean) {
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
}

export function LessonPostCreationView(props: LessonPostCreationViewProps) {
  const {
    shareLink, copied, onCopyLink, lessonYoutubeUrl, lessonTranscript,
    createdLessonId, form, currentLanguage, isParagraph, paragraphContent,
    paragraphRef, selectedExerciseTypes, generatedTypes, generatingType,
    onGenerateByType, exerciseGroups, groupStates, activeGroup, activeGroupRef,
    onUpdateGroupState, onSetActiveGroup, onCancel,
    selection, onCreateFlashcard, onExploreWord, onDismissSelection,
    wordExplorerOpen, onWordExplorerOpenChange, exploredWord, wordAnalysis,
    wordLoading, onSaveFlashcardFromExplorer, flashcardModalOpen,
    onFlashcardModalOpenChange, flashcardText, flashcardSentence, onFlashcardSuccess,
  } = props;

  const youtubeVideoId = lessonYoutubeUrl ? extractYouTubeId(lessonYoutubeUrl) : null;

  return (
    <>
      <div className="space-y-6">
        {shareLink && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Share2 className="h-4 w-4 text-primary" />
                Share this lesson with your student
              </div>
              <div className="flex items-center gap-2">
                <Input value={shareLink} readOnly className="flex-1 text-sm" />
                <Button type="button" size="sm" variant="outline" onClick={onCopyLink}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
                  onClick={() => onGenerateByType(type)}
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
        {exerciseGroups.map((group, groupIndex) => {
          const state = groupStates[group.type] || { currentIndex: 0, revealed: false };
          const exercise = group.exercises[state.currentIndex];
          if (!exercise) return null;

          const label = EXERCISE_TYPE_LABELS[group.type] || group.type;
          const colorClass = TYPE_COLORS[group.type] || "";
          const isFirst = state.currentIndex === 0;
          const isLast = state.currentIndex === group.exercises.length - 1;
          const isActive = activeGroup === group.type;
          const isCollapsed = activeGroup !== null && !isActive;

          const currentTypeIndex = selectedExerciseTypes.indexOf(group.type);
          const nextType = currentTypeIndex >= 0 && currentTypeIndex < selectedExerciseTypes.length - 1
            ? selectedExerciseTypes[currentTypeIndex + 1]
            : null;
          const nextTypeGenerated = nextType ? generatedTypes.has(nextType) : false;
          const nextTypeLabel = nextType ? (EXERCISE_TYPE_LABELS[nextType] || nextType) : null;

          if (isCollapsed) {
            return (
              <div
                key={group.type}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onSetActiveGroup(group.type);
                  setTimeout(() => activeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${colorClass}`}>
                    {label}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {group.exercises.length}/{group.exercises.length} ✓
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            );
          }

          return (
            <div key={group.type} className="space-y-3" ref={isActive ? activeGroupRef : undefined}>
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
                <Button variant="outline" size="sm" onClick={() => onUpdateGroupState(group.type, { currentIndex: state.currentIndex - 1, revealed: false })} disabled={isFirst}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <Button variant="outline" size="sm" onClick={() => onUpdateGroupState(group.type, { revealed: !state.revealed })} className="flex-1">
                  {state.revealed ? <><EyeOff className="h-4 w-4 mr-2" />Hide Answer</> : <><Eye className="h-4 w-4 mr-2" />Reveal Answer</>}
                </Button>
                {isLast && nextType ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (nextTypeGenerated) {
                        onSetActiveGroup(nextType);
                        setTimeout(() => activeGroupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
                      } else {
                        onGenerateByType(nextType);
                      }
                    }}
                    disabled={!!generatingType}
                    className="gap-1"
                  >
                    {generatingType === nextType ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {nextTypeGenerated ? `Continue to ${nextTypeLabel}` : `Generate ${nextTypeLabel}`}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onUpdateGroupState(group.type, { currentIndex: state.currentIndex + 1, revealed: false })} disabled={isLast}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
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
          onCreateFlashcard={onCreateFlashcard}
          onExploreWord={onExploreWord}
          onDismiss={onDismissSelection}
        />
      )}

      <WordExplorerPanel
        open={wordExplorerOpen}
        onOpenChange={onWordExplorerOpenChange}
        word={exploredWord}
        language={currentLanguage}
        analysis={wordAnalysis}
        loading={wordLoading}
        onSaveFlashcard={onSaveFlashcardFromExplorer}
      />

      <FlashcardCreatorModal
        open={flashcardModalOpen}
        onOpenChange={onFlashcardModalOpenChange}
        selectedText={flashcardText}
        fullSentence={flashcardSentence}
        timestamp=""
        videoId=""
        videoTitle=""
        language={currentLanguage}
        onSuccess={onFlashcardSuccess}
        preloadedAnalysis={null}
      />
    </>
  );
}
