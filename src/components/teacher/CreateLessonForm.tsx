import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Loader2, Sparkles } from "lucide-react";
import { TextSelectionPopover } from "@/components/transcript/TextSelectionPopover";
import { WordExplorerPanel } from "@/components/transcript/WordExplorerPanel";
import { FlashcardCreatorModal } from "@/components/transcript/FlashcardCreatorModal";
import { trackEvent } from "@/lib/analytics";
import { LessonPostCreationView } from "./LessonPostCreationView";
import {
  useCreateLesson,
  type LessonType,
  CEFR_LEVELS,
  LANGUAGES,
  TRANSLATION_LANGUAGES,
  PARAGRAPH_LENGTHS,
} from "@/hooks/useCreateLesson";

interface CreateLessonFormProps {
  lessonType: LessonType;
  onCreated: (lessonId: string) => void;
  onCancel: () => void;
  prefillYoutubeUrl?: string;
  prefillYoutubeTitle?: string;
  prefillYoutubeLanguage?: string;
  prefillYoutubeDifficulty?: string;
  prefillYoutubeCategory?: string | null;
  maxVideoMinutes?: number;
}

export function CreateLessonForm({
  lessonType,
  onCreated,
  onCancel,
  prefillYoutubeUrl,
  prefillYoutubeTitle,
  prefillYoutubeLanguage,
  prefillYoutubeDifficulty,
  prefillYoutubeCategory,
  maxVideoMinutes,
}: CreateLessonFormProps) {
  const navigate = useNavigate();

  const lesson = useCreateLesson({
    lessonType,
    onCreated,
    prefillYoutubeUrl,
    prefillYoutubeTitle,
    prefillYoutubeLanguage,
    prefillYoutubeDifficulty,
    prefillYoutubeCategory,
  });

  const {
    form, isParagraph, exerciseTypeOptions, emailVerified, trialExpired,
    loading, generatingParagraph, paragraphContent, createdLessonId,
    shareLink, copied, lessonTranscript, lessonYoutubeUrl,
    generatingType, selectedExerciseTypes, groupStates, activeGroup,
    activeGroupRef, paragraphRef, selection, wordExplorerOpen, wordAnalysis,
    wordLoading, exploredWord, flashcardModalOpen, flashcardText,
    flashcardSentence, currentLanguage, currentTranslationLanguage, exerciseGroups, generatedTypes,
    user, toast,
    setWordExplorerOpen, setFlashcardModalOpen, setActiveGroup,
    handleGenerateParagraph, handleExploreWord, handleCreateFlashcard,
    handleSaveFlashcardFromExplorer, onSubmit, handleGenerateByType,
    handleCopyLink, updateGroupState, handleResendVerification, clearSelection, clearParagraphDraft,
  } = lesson;

  // Email verification gate
  if (emailVerified === false) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">📧 Verify Your Email</h2>
          <p className="text-muted-foreground mb-4">Please verify your email address to start creating lessons.</p>
          <p className="text-sm text-muted-foreground mb-4">Check your inbox for a verification link from ListenFlow.</p>
          <Button onClick={handleResendVerification}>Resend Verification Email</Button>
        </div>
      </div>
    );
  }

  // Trial expired gate
  if (trialExpired) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="rounded-lg border border-destructive bg-destructive/5 p-6">
          <h2 className="text-xl font-bold mb-3 text-foreground">⏰ Trial Expired</h2>
          <p className="text-muted-foreground mb-4">Your 14-day free trial has ended. Upgrade to continue creating lessons.</p>
          <Button onClick={() => { trackEvent("trial_expired_view", { source: "create_lesson_form" }); navigate("/teacher/pricing"); }}>
            View Pricing Plans
          </Button>
        </div>
      </div>
    );
  }

  // Post-creation view
  if (createdLessonId) {
    return (
      <LessonPostCreationView
        shareLink={shareLink}
        copied={copied}
        onCopyLink={handleCopyLink}
        lessonYoutubeUrl={lessonYoutubeUrl}
        lessonTranscript={lessonTranscript}
        createdLessonId={createdLessonId}
        form={form}
        currentLanguage={currentLanguage}
        translationLanguage={currentTranslationLanguage}
        isParagraph={isParagraph}
        paragraphContent={paragraphContent}
        paragraphRef={paragraphRef}
        selectedExerciseTypes={selectedExerciseTypes}
        generatedTypes={generatedTypes}
        generatingType={generatingType}
        onGenerateByType={handleGenerateByType}
        exerciseGroups={exerciseGroups}
        groupStates={groupStates}
        activeGroup={activeGroup}
        activeGroupRef={activeGroupRef}
        onUpdateGroupState={updateGroupState}
        onSetActiveGroup={setActiveGroup}
        onCancel={onCancel}
        selection={selection}
        onCreateFlashcard={handleCreateFlashcard}
        onExploreWord={handleExploreWord}
        onDismissSelection={clearSelection}
        wordExplorerOpen={wordExplorerOpen}
        onWordExplorerOpenChange={setWordExplorerOpen}
        exploredWord={exploredWord}
        wordAnalysis={wordAnalysis}
        wordLoading={wordLoading}
        onSaveFlashcardFromExplorer={handleSaveFlashcardFromExplorer}
        flashcardModalOpen={flashcardModalOpen}
        onFlashcardModalOpenChange={setFlashcardModalOpen}
        flashcardText={flashcardText}
        flashcardSentence={flashcardSentence}
        onFlashcardSuccess={() => toast({ title: "Flashcard saved! ✨" })}
      />
    );
  }

  const handleCancel = () => {
    if (isParagraph) clearParagraphDraft();
    onCancel();
  };

  // Creation form
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {isParagraph && (
            <>
              <FormField control={form.control} name="paragraph_prompt" render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe the paragraph you want to generate</FormLabel>
                  <FormControl><Textarea placeholder="e.g. Giuseppe arrives in Rio de Janeiro and checks into a hostel for the first time" rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cefr_level" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEFR Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                    <SelectContent>{CEFR_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="language" render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                    <SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="paragraph_length" render={({ field }) => (
                <FormItem>
                  <FormLabel>Paragraph Length</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select length" /></SelectTrigger></FormControl>
                    <SelectContent>{PARAGRAPH_LENGTHS.map((len) => <SelectItem key={len.value} value={len.value}>{len.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="button" variant="outline" onClick={handleGenerateParagraph} disabled={generatingParagraph}>
                {generatingParagraph ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Generate Paragraph
              </Button>
              {paragraphContent && (
                <Card className="border-primary/30 bg-primary/5 relative">
                  <CardContent className="pt-4">
                    <FormLabel className="mb-2 block">Generated Paragraph</FormLabel>
                    <p className="text-sm text-muted-foreground mb-2">Select any word or phrase to explore it or save as a flashcard.</p>
                    <div ref={paragraphRef} className="bg-background rounded-md p-4 text-foreground leading-relaxed whitespace-pre-wrap cursor-text select-text border">
                      {paragraphContent}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!isParagraph && (
            <>
              <FormField control={form.control} name="youtube_url" render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=... or youtube.com/shorts/..." {...field} readOnly={!!prefillYoutubeUrl} className={prefillYoutubeUrl ? "bg-muted" : ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="topic" render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl><Input placeholder="e.g. Ordering food at a restaurant" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="cefr_level" render={({ field }) => (
                <FormItem>
                  <FormLabel>CEFR Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger></FormControl>
                    <SelectContent>{CEFR_LEVELS.map((level) => <SelectItem key={level} value={level}>{level}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="language" render={({ field }) => (
                <FormItem>
                  <FormLabel>Video Language</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger></FormControl>
                    <SelectContent>{LANGUAGES.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </>
          )}

          <FormField control={form.control} name="title" render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson Title</FormLabel>
              <FormControl><Input placeholder="e.g. Present Tense Practice" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="student_email" render={({ field }) => (
            <FormItem>
              <FormLabel>Student Email</FormLabel>
              <FormControl><Input placeholder="student@example.com" type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="translation_language" render={({ field }) => (
            <FormItem>
              <FormLabel>Translation Language <span className="text-muted-foreground text-xs">(for student hints)</span></FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select translation language" /></SelectTrigger></FormControl>
                <SelectContent>{TRANSLATION_LANGUAGES.map((lang) => <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>)}</SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="exercise_types" render={() => (
            <FormItem>
              <FormLabel>Exercise Types</FormLabel>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {exerciseTypeOptions.map((type) => (
                  <FormField key={type.id} control={form.control} name="exercise_types" render={({ field }) => (
                    <FormItem className="flex items-center gap-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value?.includes(type.id)}
                          onCheckedChange={(checked) => {
                            const current = field.value || [];
                            field.onChange(checked ? [...current, type.id] : current.filter((v: string) => v !== type.id));
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal cursor-pointer">{type.label}</FormLabel>
                    </FormItem>
                  )} />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )} />

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Lesson
            </Button>
            <Button type="button" variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
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
        translationLanguage={currentTranslationLanguage}
        onSuccess={() => toast({ title: "Flashcard saved! ✨" })}
        preloadedAnalysis={
          wordAnalysis
            ? { translation: wordAnalysis.translation, partOfSpeech: wordAnalysis.partOfSpeech }
            : null
        }
      />
    </>
  );
}
