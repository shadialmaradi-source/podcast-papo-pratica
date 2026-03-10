import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  RefreshCw,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";

const LANGUAGES = [
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
];

const TRANSLATION_LANGUAGES = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "italian", label: "Italian" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
];

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1"];

interface Topic {
  title: string;
  description: string;
  suggested_level: string;
}

interface Question {
  question: string;
  difficulty: number;
}

interface VocabItem {
  id: string;
  target_word: string;
  translation: string;
  teacher_note: string;
  translating?: boolean;
}

type Step = "config" | "topics" | "questions" | "vocabulary" | "review";

interface SpeakingLessonCreatorProps {
  onCancel: () => void;
  onCreated: (lessonId: string) => void;
}

const STORAGE_KEY = "speaking_lesson_creator_state";

function loadSaved<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return key in parsed ? parsed[key] : fallback;
  } catch {
    return fallback;
  }
}

export function SpeakingLessonCreator({ onCancel, onCreated }: SpeakingLessonCreatorProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const skipPersist = useRef(false);

  // Step 1: Config
  const [language, setLanguage] = useState(() => loadSaved("language", "italian"));
  const [translationLanguage, setTranslationLanguage] = useState(() => loadSaved("translationLanguage", "english"));
  const [level, setLevel] = useState(() => loadSaved("level", "A2"));
  const [step, setStep] = useState<Step>(() => loadSaved("step", "config"));

  // Step 2: Topics
  const [topics, setTopics] = useState<Topic[]>(() => loadSaved("topics", []));
  const [selectedTopicIdx, setSelectedTopicIdx] = useState<number | null>(() => loadSaved("selectedTopicIdx", null));
  const [customMode, setCustomMode] = useState(() => loadSaved("customMode", false));
  const [customTitle, setCustomTitle] = useState(() => loadSaved("customTitle", ""));
  const [customDescription, setCustomDescription] = useState(() => loadSaved("customDescription", ""));
  const [loadingTopics, setLoadingTopics] = useState(false);

  // Step 3: Questions
  const [questions, setQuestions] = useState<Question[]>(() => loadSaved("questions", []));
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Step 4: Vocabulary
  const [vocabByQuestion, setVocabByQuestion] = useState<Record<number, VocabItem[]>>(() => loadSaved("vocabByQuestion", {}));
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);
  const [newWord, setNewWord] = useState("");

  // Step 5: Review
  const [title, setTitle] = useState(() => loadSaved("title", ""));
  const [studentEmail, setStudentEmail] = useState(() => loadSaved("studentEmail", ""));
  const [creating, setCreating] = useState(false);
  const [students, setStudents] = useState<{ student_email: string; student_name: string | null }[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);

  // Persist state to sessionStorage
  useEffect(() => {
    if (skipPersist.current) return;
    const state = {
      step, language, translationLanguage, level,
      topics, selectedTopicIdx, customMode, customTitle, customDescription,
      questions, vocabByQuestion, title, studentEmail,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [step, language, translationLanguage, level, topics, selectedTopicIdx, customMode, customTitle, customDescription, questions, vocabByQuestion, title, studentEmail]);

  const clearSavedState = () => {
    skipPersist.current = true;
    sessionStorage.removeItem(STORAGE_KEY);
  };

  const selectedTopic = customMode
    ? { title: customTitle, description: customDescription, suggested_level: level }
    : selectedTopicIdx !== null
    ? topics[selectedTopicIdx]
    : null;

  const langLabel = LANGUAGES.find((l) => l.value === language)?.label || language;
  const transLabel = TRANSLATION_LANGUAGES.find((l) => l.value === translationLanguage)?.label || translationLanguage;

  // Load students on review step
  const loadStudents = useCallback(async () => {
    if (studentsLoaded || !user) return;
    const { data } = await supabase
      .from("teacher_students")
      .select("student_email, student_name")
      .eq("teacher_id", user.id);
    if (data) setStudents(data);
    setStudentsLoaded(true);
  }, [user, studentsLoaded]);

  // ---- STEP HANDLERS ----

  const handleGenerateTopics = async () => {
    setLoadingTopics(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-speaking-topics", {
        body: { language: langLabel, level, count: 3 },
      });
      if (error) throw error;
      setTopics(data.topics || []);
      setSelectedTopicIdx(null);
      setCustomMode(false);
      setStep("topics");
      trackEvent("speaking_topic_generated", { language, level });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate topics. Try again.");
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!selectedTopic) return;
    setLoadingQuestions(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-speaking-questions", {
        body: {
          topic: selectedTopic.title,
          level,
          language: langLabel,
        },
      });
      if (error) throw error;
      setQuestions(data.questions || []);
      setVocabByQuestion({});
      setStep("questions");
      trackEvent("speaking_questions_generated", { language, level, topic: selectedTopic.title });
    } catch (err: any) {
      toast.error(err.message || "Failed to generate questions.");
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleTranslateWord = async (questionIdx: number, vocabIdx: number) => {
    const vocab = vocabByQuestion[questionIdx]?.[vocabIdx];
    if (!vocab || !vocab.target_word.trim()) return;

    setVocabByQuestion((prev) => ({
      ...prev,
      [questionIdx]: prev[questionIdx].map((v, i) =>
        i === vocabIdx ? { ...v, translating: true } : v
      ),
    }));

    try {
      const { data, error } = await supabase.functions.invoke("translate-vocabulary", {
        body: {
          word: vocab.target_word,
          source_language: langLabel,
          target_language: transLabel,
          context: questions[questionIdx]?.question || "",
        },
      });
      if (error) throw error;

      setVocabByQuestion((prev) => ({
        ...prev,
        [questionIdx]: prev[questionIdx].map((v, i) =>
          i === vocabIdx
            ? {
                ...v,
                translation: data.translation || "",
                teacher_note: data.note || v.teacher_note,
                translating: false,
              }
            : v
        ),
      }));
    } catch {
      toast.error("Translation failed. Enter manually.");
      setVocabByQuestion((prev) => ({
        ...prev,
        [questionIdx]: prev[questionIdx].map((v, i) =>
          i === vocabIdx ? { ...v, translating: false } : v
        ),
      }));
    }
  };

  const addVocabItem = (questionIdx: number) => {
    if (!newWord.trim()) return;
    const item: VocabItem = {
      id: crypto.randomUUID(),
      target_word: newWord.trim(),
      translation: "",
      teacher_note: "",
    };
    setVocabByQuestion((prev) => ({
      ...prev,
      [questionIdx]: [...(prev[questionIdx] || []), item],
    }));
    setNewWord("");

    // Auto-translate
    const idx = (vocabByQuestion[questionIdx] || []).length;
    setTimeout(() => handleTranslateWord(questionIdx, idx), 100);
  };

  const removeVocabItem = (questionIdx: number, vocabIdx: number) => {
    setVocabByQuestion((prev) => ({
      ...prev,
      [questionIdx]: prev[questionIdx].filter((_, i) => i !== vocabIdx),
    }));
  };

  const totalVocabCount = Object.values(vocabByQuestion).reduce((sum, arr) => sum + arr.length, 0);

  const handleCreate = async () => {
    if (!user || !selectedTopic) return;

    // Validate student email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!studentEmail.trim() || !emailRegex.test(studentEmail.trim())) {
      toast.error("Please enter a valid student email address.");
      return;
    }

    setCreating(true);

    try {
      const shareToken = crypto.randomUUID();
      const lessonTitle = title.trim() || `${selectedTopic.title} - ${level}`;

      // 1. Create teacher_lesson
      const { data: lessonData, error: lessonError } = await supabase
        .from("teacher_lessons")
        .insert({
          teacher_id: user.id,
          title: lessonTitle,
          lesson_type: "speaking",
          language,
          translation_language: translationLanguage,
          cefr_level: level,
          topic: selectedTopic.title,
          speaking_topic: selectedTopic.title,
          speaking_description: selectedTopic.description,
          student_email: studentEmail.trim().toLowerCase(),
          share_token: shareToken,
          status: "ready",
          exercise_types: [],
        } as any)
        .select("id")
        .single();

      if (lessonError) throw lessonError;
      const lessonId = lessonData.id;

      // 2. Insert questions
      const questionInserts = questions.map((q, idx) => ({
        lesson_id: lessonId,
        question_text: q.question,
        difficulty: q.difficulty,
        order_index: idx,
      }));

      const { data: insertedQuestions, error: qError } = await supabase
        .from("speaking_lesson_questions" as any)
        .insert(questionInserts)
        .select("id, order_index");

      if (qError) throw qError;

      // 3. Insert vocabulary
      const vocabInserts: any[] = [];
      for (const q of (insertedQuestions as any[])) {
        const qVocab = vocabByQuestion[q.order_index] || [];
        for (const v of qVocab) {
          vocabInserts.push({
            question_id: q.id,
            target_word: v.target_word,
            translation: v.translation,
            teacher_note: v.teacher_note || null,
          });
        }
      }

      if (vocabInserts.length > 0) {
        const { error: vError } = await supabase
          .from("speaking_vocabulary" as any)
          .insert(vocabInserts);
        if (vError) throw vError;
      }

      // 4. Auto-add student to roster
      await supabase
        .from("teacher_students" as any)
        .upsert({
          teacher_id: user.id,
          student_email: studentEmail.trim().toLowerCase(),
          status: "invited",
        } as any, { onConflict: "teacher_id,student_email", ignoreDuplicates: true });

      trackEvent("speaking_lesson_created", {
        language,
        level,
        topic: selectedTopic.title,
        question_count: questions.length,
        vocabulary_count: totalVocabCount,
      });

      clearSavedState();
      toast.success("Speaking lesson created!");
      navigate(`/teacher/lesson/${lessonId}`);
      onCreated(lessonId);
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("LESSON_LIMIT_REACHED")) {
        const cleanMsg = msg.split("LESSON_LIMIT_REACHED:")[1] || "You've reached your lesson limit.";
        trackEvent("lesson_limit_reached", { source: "speaking_lesson_creator" });
        toast.error(`${cleanMsg} Upgrade your plan for more lessons.`);
      } else {
        toast.error(msg || "Failed to create lesson.");
      }
    } finally {
      setCreating(false);
    }
  };

  const difficultyLabel = (d: number) =>
    d === 1 ? "Easy" : d === 2 ? "Medium" : "Hard";
  const difficultyColor = (d: number) =>
    d === 1
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : d === 2
      ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
      : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  // ---- RENDER ----

  return (
    <div className="space-y-4">
      {/* STEP: Config */}
      {step === "config" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Create Speaking Practice Lesson
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Choose the language and level for your speaking lesson.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Target Language *</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Translation Language</Label>
              <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TRANSLATION_LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Student Level *</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CEFR_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => { clearSavedState(); onCancel(); }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleGenerateTopics} disabled={loadingTopics}>
              {loadingTopics ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Topics...
                </>
              ) : (
                <>
                  Next: Generate Topics
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Topics */}
      {step === "topics" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Choose a Discussion Topic</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Select a suggestion or enter your own topic.
            </p>
          </div>

          {!customMode ? (
            <div className="space-y-3">
              {topics.map((topic, idx) => (
                <Card
                  key={idx}
                  className={`cursor-pointer transition-all ${
                    selectedTopicIdx === idx
                      ? "border-primary ring-2 ring-primary/20"
                      : "hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedTopicIdx(idx)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-foreground">{topic.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">{topic.description}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0 ml-2">
                        {topic.suggested_level}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateTopics}
                  disabled={loadingTopics}
                >
                  <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingTopics ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCustomMode(true)}>
                  Use Custom Topic
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Topic Title *</Label>
                <Input
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="e.g. My Last Vacation"
                />
              </div>
              <div className="space-y-2">
                <Label>Description (optional)</Label>
                <Textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Brief description of the topic..."
                  className="min-h-[60px]"
                />
              </div>
              <Button variant="outline" size="sm" onClick={() => setCustomMode(false)}>
                Back to Suggestions
              </Button>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("config")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleGenerateQuestions}
              disabled={!selectedTopic || (!customMode && selectedTopicIdx === null) || (customMode && !customTitle.trim()) || loadingQuestions}
            >
              {loadingQuestions ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  Next: Generate Questions
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Questions */}
      {step === "questions" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Discussion Questions</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {langLabel} · {level} · {selectedTopic?.title}
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <span className="text-sm font-bold text-muted-foreground mt-0.5">{idx + 1}.</span>
                    <div className="flex-1">
                      <p className="text-foreground">{q.question}</p>
                      <Badge className={`mt-2 text-xs ${difficultyColor(q.difficulty)}`}>
                        {difficultyLabel(q.difficulty)}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateQuestions}
            disabled={loadingQuestions}
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loadingQuestions ? "animate-spin" : ""}`} />
            Regenerate Questions
          </Button>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("topics")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={() => setStep("vocabulary")}>
              Next: Add Vocabulary
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Vocabulary */}
      {step === "vocabulary" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Add Vocabulary Help</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Click a question to add words students might need. Auto-translated to {transLabel}.
            </p>
          </div>

          <div className="space-y-3">
            {questions.map((q, idx) => {
              const isExpanded = expandedQuestion === idx;
              const vocabItems = vocabByQuestion[idx] || [];

              return (
                <Card key={idx}>
                  <CardContent className="p-4 space-y-3">
                    <button
                      className="w-full flex items-start gap-3 text-left"
                      onClick={() => setExpandedQuestion(isExpanded ? null : idx)}
                    >
                      <span className="text-sm font-bold text-muted-foreground mt-0.5">{idx + 1}.</span>
                      <div className="flex-1">
                        <p className="text-foreground text-sm">{q.question}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${difficultyColor(q.difficulty)}`}>
                            {difficultyLabel(q.difficulty)}
                          </Badge>
                          {vocabItems.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {vocabItems.length} word{vocabItems.length !== 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 border-t border-border pt-3">
                        {vocabItems.map((v, vi) => (
                          <div key={v.id} className="flex items-center gap-2">
                            <Input
                              value={v.target_word}
                              onChange={(e) =>
                                setVocabByQuestion((prev) => ({
                                  ...prev,
                                  [idx]: prev[idx].map((item, i) =>
                                    i === vi ? { ...item, target_word: e.target.value } : item
                                  ),
                                }))
                              }
                              className="flex-1 text-sm"
                              placeholder={langLabel}
                            />
                            <span className="text-muted-foreground">→</span>
                            {v.translating ? (
                              <div className="flex-1 flex items-center justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              </div>
                            ) : (
                              <Input
                                value={v.translation}
                                onChange={(e) =>
                                  setVocabByQuestion((prev) => ({
                                    ...prev,
                                    [idx]: prev[idx].map((item, i) =>
                                      i === vi ? { ...item, translation: e.target.value } : item
                                    ),
                                  }))
                                }
                                className="flex-1 text-sm"
                                placeholder={transLabel}
                              />
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => removeVocabItem(idx, vi)}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                          </div>
                        ))}

                        {vocabItems.some((v) => v.teacher_note) && (
                          <div className="space-y-1">
                            {vocabItems
                              .filter((v) => v.teacher_note)
                              .map((v) => (
                                <p key={v.id} className="text-xs text-muted-foreground italic">
                                  📝 {v.target_word}: {v.teacher_note}
                                </p>
                              ))}
                          </div>
                        )}

                        <div className="flex gap-2">
                          <Input
                            value={newWord}
                            onChange={(e) => setNewWord(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addVocabItem(idx);
                              }
                            }}
                            placeholder={`Add ${langLabel} word...`}
                            className="text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => addVocabItem(idx)}
                            disabled={!newWord.trim()}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("questions")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={() => {
                setStep("review");
                loadStudents();
              }}
            >
              Next: Review & Create
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP: Review */}
      {step === "review" && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Review Your Speaking Lesson</h3>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Topic</span>
                <span className="font-medium text-foreground">{selectedTopic?.title}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Language</span>
                <span className="font-medium text-foreground">{langLabel}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Level</span>
                <span className="font-medium text-foreground">{level}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-medium text-foreground">{questions.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vocabulary</span>
                <span className="font-medium text-foreground">{totalVocabCount} words</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`${selectedTopic?.title} - ${level}`}
              />
            </div>

            <div className="space-y-2">
              <Label>Assign to Student *</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  placeholder="Enter student email..."
                  list="student-email-suggestions"
                  required
                />
                <datalist id="student-email-suggestions">
                  {students.map((s) => (
                    <option key={s.student_email} value={s.student_email}>
                      {s.student_name || s.student_email}
                    </option>
                  ))}
                </datalist>
              </div>
              {students.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Type a new email or select from your existing students.
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="ghost" size="sm" onClick={() => setStep("vocabulary")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create Lesson
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
