import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { Exercise } from "@/services/exerciseGeneratorService";
import { canUserDoVocalExercise, type VocalQuotaResult } from "@/services/subscriptionService";
import { normalizeLanguageCode } from "@/utils/languageUtils";
import { resolveDbVideoId, resolveTranscriptMeta } from "@/utils/videoResolver";

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (a: string, b: string): number => {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
};

const isFuzzyMatch = (userAnswer: string, correctAnswer: string): boolean => {
  const a = userAnswer.toLowerCase().trim();
  const b = correctAnswer.toLowerCase().trim();
  if (a === b) return true;
  const len = b.length;
  if (len <= 3) return false;
  const maxDist = len <= 6 ? 1 : 2;
  return levenshteinDistance(a, b) <= maxDist;
};

export const checkAnswerCorrectness = (exercise: Exercise, userAnswer: string): boolean => {
  if (!userAnswer) return false;
  switch (exercise.type) {
    case "Cloze":
    case "fill_blank":
      return isFuzzyMatch(userAnswer, exercise.correctAnswer);
    case "MCQ":
    case "TF":
    case "SpotError":
    case "multiple_choice":
    case "word_recognition":
    case "emoji_match":
    case "comprehension_check":
    case "sequence_recall":
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
    case "Matching":
    case "matching":
      try {
        const correctPairs = JSON.parse(exercise.correctAnswer);
        const userPairs = userAnswer.split(',').filter(Boolean);
        if (userPairs.length !== correctPairs.length) return false;
        return userPairs.every((pair, idx) => pair === correctPairs[idx]);
      } catch {
        return false;
      }
    case "Sequencing":
    case "sequencing":
      try {
        const correctSequence = JSON.parse(exercise.correctAnswer);
        const userSequence = userAnswer.split(',').map(i => parseInt(i)).filter(i => !isNaN(i));
        if (userSequence.length !== correctSequence.length) return false;
        return userSequence.every((val, idx) => val === correctSequence[idx]);
      } catch {
        return false;
      }
    default:
      return userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
  }
};

export const getNextLevel = (currentLevel: string): string | null => {
  const normalized = currentLevel.toLowerCase();
  switch (normalized) {
    case 'beginner': case 'a1': case 'a2': return 'intermediate';
    case 'intermediate': case 'b1': case 'b2': return 'advanced';
    case 'advanced': case 'c1': case 'c2': return null;
    default: return null;
  }
};

const mapLevelToDbDifficulty = (lvl: string): string => {
  switch (lvl.toLowerCase()) {
    case 'a1': case 'a2': case 'beginner': return 'beginner';
    case 'b1': case 'b2': case 'intermediate': return 'intermediate';
    case 'c1': case 'c2': case 'advanced': return 'advanced';
    default: return lvl.toLowerCase();
  }
};

const mapDbTypeToExerciseType = (dbType: string): string => {
  switch (dbType) {
    case 'multiple_choice': return 'MCQ';
    case 'true_false': return 'TF';
    case 'fill_blank': case 'gap_fill': return 'Cloze';
    case 'matching': return 'Matching';
    case 'sequencing': return 'Sequencing';
    case 'word_recognition': case 'emoji_match': case 'comprehension_check': case 'sequence_recall': return dbType;
    default: return 'MCQ';
  }
};

const parseOptions = (options: any): string[] => {
  if (!options) return [];
  if (Array.isArray(options)) return options;
  if (typeof options === 'string') {
    try { return JSON.parse(options); } catch { return []; }
  }
  return [];
};

interface UseYouTubeExercisesOptions {
  videoId: string;
  level: string;
  intensity: string;
  sceneId?: string;
  sceneTranscript?: string;
}

export function useYouTubeExercises({ videoId, level, intensity, sceneId, sceneTranscript }: UseYouTubeExercisesOptions) {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [dragDropExercises, setDragDropExercises] = useState<Exercise[]>([]);
  const [regularExercises, setRegularExercises] = useState<Exercise[]>([]);
  const [showDragDrop, setShowDragDrop] = useState(false);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [dbVideoId, setDbVideoId] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentAnswerCorrect, setCurrentAnswerCorrect] = useState(false);
  const [vocalQuota, setVocalQuota] = useState<VocalQuotaResult | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const currentExercise = exercises[currentExerciseIndex];
  const progress = exercises.length > 0 ? ((currentExerciseIndex + 1) / exercises.length) * 100 : 0;

  const saveProgress = async (questionIndex: number) => {
    if (!dbVideoId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dbDifficulty = mapLevelToDbDifficulty(level);
      await supabase
        .from('youtube_exercise_progress')
        .upsert({
          user_id: user.id,
          video_id: dbVideoId,
          difficulty: dbDifficulty,
          current_question_index: questionIndex,
          total_questions: exercises.length,
          answers: answers,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id,video_id,difficulty' });
    } catch (error) {
      console.error('Error saving progress:', error);
    }
  };

  const deleteProgress = async () => {
    if (!dbVideoId) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const dbDifficulty = mapLevelToDbDifficulty(level);
      await supabase
        .from('youtube_exercise_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('video_id', dbVideoId)
        .eq('difficulty', dbDifficulty);
    } catch (error) {
      console.error('Error deleting progress:', error);
    }
  };

  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      setError("");
      try {
        let userNativeLanguage = '';
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('native_language')
            .eq('user_id', authUser.id)
            .single();
          if (profile?.native_language) userNativeLanguage = profile.native_language;
        }
        if (!userNativeLanguage) {
          const stored = localStorage.getItem('onboarding_native_language');
          if (stored) userNativeLanguage = stored;
        }
        if (!userNativeLanguage) {
          const browserLang = navigator.language.split('-')[0].toLowerCase();
          const langMap: Record<string, string> = { en: 'english', it: 'italian', es: 'spanish', pt: 'portuguese', fr: 'french' };
          userNativeLanguage = langMap[browserLang] || 'english';
        }

        let { data: videoData } = await supabase
          .from('youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .single();
        if (!videoData) {
          const { data: videoById } = await supabase
            .from('youtube_videos')
            .select('id')
            .eq('id', videoId)
            .single();
          videoData = videoById;
        }

        if (videoData) {
          setDbVideoId(videoData.id);
          const dbDifficulty = mapLevelToDbDifficulty(level);

          let videoLanguage = 'english';
          const { data: transcriptMeta } = await supabase
            .from('youtube_transcripts')
            .select('language')
            .eq('video_id', videoData.id)
            .maybeSingle();
          if (transcriptMeta?.language) {
            videoLanguage = normalizeLanguageCode(transcriptMeta.language);
          }

          const fetchExercises = async (sceneIdParam: string | null) => {
            const result = await supabase.rpc('get_youtube_exercises_with_answers', {
              video_id_param: videoData!.id,
              difficulty_param: dbDifficulty,
              native_language_param: userNativeLanguage,
              scene_id_param: sceneIdParam,
            });
            if (result.error) console.error('RPC fetch error:', result.error);
            return result.data || [];
          };

          const generateExercises = async (sceneIdParam?: string, sceneTranscriptParam?: string) => {
            const body: any = {
              videoId: videoData!.id,
              level: dbDifficulty,
              nativeLanguage: userNativeLanguage,
              language: videoLanguage,
            };
            if (sceneIdParam) {
              body.sceneId = sceneIdParam;
              body.sceneTranscript = sceneTranscriptParam || '';
              body.transcript = sceneTranscriptParam || '';
            }
            const { error: invokeError, data: invokeData } = await supabase.functions.invoke('generate-level-exercises', { body });
            if (invokeError) console.error('Exercise generation error:', invokeError);
            if (invokeData?.error) console.error('Exercise generation data error:', invokeData.error);
          };

          let dbExercises: any[] = [];
          dbExercises = await fetchExercises(sceneId || null);
          if (dbExercises.length === 0) {
            console.log('No exercises found, generating...');
            if (sceneId) {
              await generateExercises(sceneId, sceneTranscript);
              dbExercises = await fetchExercises(sceneId);
              if (dbExercises.length === 0) {
                setError("Could not generate exercises for this scene. Please try again.");
                setIsLoading(false);
                return;
              }
            } else {
              await generateExercises();
              dbExercises = await fetchExercises(null);
            }
          }

          if (dbExercises && dbExercises.length > 0) {
            const shuffled = [...dbExercises].sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 10);
            const formattedExercises: Exercise[] = selected.map((ex) => ({
              id: ex.id,
              type: mapDbTypeToExerciseType(ex.exercise_type) as Exercise['type'],
              question: ex.question,
              options: parseOptions(ex.options),
              correctAnswer: ex.correct_answer,
              explanation: ex.explanation || '',
              points: ex.xp_reward || 10,
              difficulty: ex.difficulty,
              level: level,
              mode: 'intense' as Exercise['mode'],
              questionTranslation: (ex as any).question_translation || null,
              contextSentence: (ex as any).context_sentence || null
            }));
            setRegularExercises(formattedExercises);
            setExercises(formattedExercises);
            setDragDropExercises([]);
            toast({
              title: "Exercises Ready! 🎯",
              description: `${formattedExercises.length} exercises${sceneId ? ' for this scene' : ''}.`,
            });
            setIsLoading(false);
            return;
          }
        }

        console.error('No exercises found in database');
        setError("Esercizi non trovati. Torna indietro e seleziona nuovamente il livello per generarli.");
      } catch (err) {
        setError("Failed to load exercises. Please try another video.");
        console.error('Error loading exercises:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadExercises();
  }, [videoId, level, intensity, sceneId]);

  useEffect(() => {
    if (showResults && user) {
      canUserDoVocalExercise(user.id).then(setVocalQuota);
    }
  }, [showResults, user]);

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentExercise.id]: value }));
    if (currentExercise.type === "MCQ" || currentExercise.type === "TF" ||
        currentExercise.type === "multiple_choice" || currentExercise.type === "word_recognition" ||
        currentExercise.type === "emoji_match" || currentExercise.type === "comprehension_check" ||
        currentExercise.type === "sequence_recall") {
      const isCorrect = checkAnswerCorrectness(currentExercise, value);
      setCurrentAnswerCorrect(isCorrect);
      setShowFeedback(true);
      trackEvent('exercise_answered', {
        correct: isCorrect,
        exercise_type: currentExercise.type,
        question_index: currentExerciseIndex,
        video_id: videoId,
      });
    }
  };

  const handleCheckAnswer = () => {
    const userAnswer = answers[currentExercise.id];
    const isCorrect = checkAnswerCorrectness(currentExercise, userAnswer);
    setCurrentAnswerCorrect(isCorrect);
    setShowFeedback(true);
  };

  const handleNext = async () => {
    setShowFeedback(false);
    if (currentExerciseIndex < exercises.length - 1) {
      const newIndex = currentExerciseIndex + 1;
      setCurrentExerciseIndex(newIndex);
      await saveProgress(newIndex);
    } else {
      if (!showDragDrop && dragDropExercises.length > 0) {
        setShowDragDrop(true);
        return;
      }
      const allExercises = [...regularExercises, ...dragDropExercises];
      const totalScore = allExercises.reduce((total, exercise) => {
        const userAnswer = answers[exercise.id];
        const isCorrect = checkAnswerCorrectness(exercise, userAnswer);
        return total + (isCorrect ? exercise.points : 0);
      }, 0);
      setScore(totalScore);
      setShowResults(true);
      await deleteProgress();
    }
  };

  const handleDragDropComplete = (results: any[]) => {
    const dragDropAnswers: Record<string, string> = {};
    results.forEach(result => {
      dragDropAnswers[result.exerciseId] = typeof result.userAnswer === 'string'
        ? result.userAnswer
        : JSON.stringify(result.userAnswer);
    });
    setAnswers(prev => ({ ...prev, ...dragDropAnswers }));
    const allExercises = [...regularExercises, ...dragDropExercises];
    const totalScore = allExercises.reduce((total, exercise) => {
      const userAnswer = answers[exercise.id] || dragDropAnswers[exercise.id];
      const isCorrect = checkAnswerCorrectness(exercise, userAnswer);
      return total + (isCorrect ? exercise.points : 0);
    }, 0);
    setScore(totalScore);
    setShowResults(true);
  };

  return {
    exercises,
    dragDropExercises,
    regularExercises,
    showDragDrop,
    currentExerciseIndex,
    answers,
    showResults,
    score,
    isLoading,
    error,
    showFeedback,
    currentAnswerCorrect,
    vocalQuota,
    showUpgradePrompt,
    currentExercise,
    progress,
    // Setters
    setShowDragDrop,
    setCurrentExerciseIndex,
    setShowFeedback,
    setShowUpgradePrompt,
    // Handlers
    handleAnswerChange,
    handleCheckAnswer,
    handleNext,
    handleDragDropComplete,
  };
}
