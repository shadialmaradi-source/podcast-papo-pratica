import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye } from "lucide-react";
import LessonIntro from "@/components/lesson/LessonIntro";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import LessonExercises from "@/components/lesson/LessonExercises";
import LessonSpeaking from "@/components/lesson/LessonSpeaking";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import LessonComplete from "@/components/lesson/LessonComplete";
import { allLessonContent, getLocalizedContent } from "@/data/firstLessonContent";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackPageView, trackFunnelStep } from "@/lib/analytics";

type LessonStep = 'intro' | 'video' | 'exercises' | 'speaking' | 'flashcards' | 'complete';

interface OnboardingVideo {
  youtube_id: string;
  start_time: number;
  duration: number;
  suggested_speed: number;
  transcript: string | null;
  is_short: boolean;
  exercises: any[] | null;
  speaking_phrases: any[] | null;
  flashcards: any[] | null;
}

const FirstLesson = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTeacherPreview = searchParams.get("from") === "teacher-onboarding";
  const [step, setStep] = useState<LessonStep>(() => {
    const saved = localStorage.getItem('lesson_step') as LessonStep | null;
    const validSteps: LessonStep[] = ['intro', 'video', 'exercises', 'speaking', 'flashcards'];
    return saved && validSteps.includes(saved) ? saved : 'intro';
  });
  const [exerciseScore, setExerciseScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(5);
  const [phrasesLearned, setPhrasesLearned] = useState(0);
  const [flashcardsLearned, setFlashcardsLearned] = useState(0);
  const [onboardingVideo, setOnboardingVideo] = useState<OnboardingVideo | null>(null);

  // Get user's selections from localStorage
  const userLevel = localStorage.getItem('onboarding_level') || 'absolute_beginner';
  const targetLanguage = localStorage.getItem('onboarding_language') || 'english';
  const nativeLanguage = localStorage.getItem('onboarding_native_language') || 'en';

  // Redirect to onboarding if required params are missing
  useEffect(() => {
    if (isTeacherPreview) return;
    const hasLanguage = localStorage.getItem('onboarding_language');
    const hasNative = localStorage.getItem('onboarding_native_language');
    const hasLevel = localStorage.getItem('onboarding_level');
    if (!hasLanguage || !hasNative || !hasLevel) {
      navigate('/onboarding', { replace: true });
    }
  }, [navigate, isTeacherPreview]);

  // Get fallback content for the selected language and level
  const languageContent = allLessonContent[targetLanguage] || allLessonContent.spanish;
  const rawContent = languageContent[userLevel] || languageContent.absolute_beginner;
  const content = getLocalizedContent(rawContent, nativeLanguage);

  // Fetch onboarding video from Supabase
  useEffect(() => {
    const fetchVideo = async () => {
      const { data } = await supabase
        .from('onboarding_videos')
        .select('youtube_id, start_time, duration, suggested_speed, transcript, is_short, exercises, speaking_phrases, flashcards')
        .eq('language', targetLanguage)
        .eq('level', userLevel)
        .maybeSingle();
      
      if (data) {
        setOnboardingVideo(data as unknown as OnboardingVideo);
      }
    };
    fetchVideo();
  }, [targetLanguage, userLevel]);

  useEffect(() => {
    trackPageView("first_lesson", "student");
    trackEvent('first_lesson_started', { language: targetLanguage, level: userLevel });
    trackFunnelStep("first_lesson", "intro", 0, { language: targetLanguage, level: userLevel });

    // Track abandonment on page leave
    const handleBeforeUnload = () => {
      const currentStep = localStorage.getItem('lesson_step') || 'intro';
      if (currentStep !== 'complete') {
        trackEvent('first_lesson_abandoned', { last_step: currentStep, language: targetLanguage, level: userLevel });
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const stepIndexMap: Record<LessonStep, number> = { intro: 0, video: 1, exercises: 2, speaking: 3, flashcards: 4, complete: 5 };

  useEffect(() => {
    if (step !== 'complete') {
      localStorage.setItem('lesson_step', step);
    }
    trackFunnelStep("first_lesson", step, stepIndexMap[step]);
  }, [step]);

  // Build video data: prefer Supabase, fallback to hardcoded
  const videoData = onboardingVideo
    ? {
        youtubeId: onboardingVideo.youtube_id,
        startTime: onboardingVideo.start_time,
        duration: onboardingVideo.duration,
        suggestedSpeed: onboardingVideo.suggested_speed,
        isShort: onboardingVideo.is_short,
      }
    : content.video;

  const handleExercisesComplete = (score: number, total: number) => {
    setExerciseScore(score);
    setTotalExercises(total);
    setStep('speaking');
  };

  // Use DB content when available, fallback to hardcoded
  const activeExercises = onboardingVideo?.exercises || content.exercises;
  const activeSpeakingPhrases = onboardingVideo?.speaking_phrases || content.speakingPhrases;
  const activeFlashcards = onboardingVideo?.flashcards || content.flashcards;

  const handleSpeakingComplete = () => {
    setPhrasesLearned(activeSpeakingPhrases.length);
    setStep('flashcards');
  };

  const handleFlashcardsComplete = () => {
    setFlashcardsLearned(activeFlashcards.length);
    setStep('complete');
    // Clear persisted step after navigating to complete screen
    localStorage.removeItem('lesson_step');
    localStorage.setItem('first_lesson_completed', 'true');
  };

  const teacherBanner = isTeacherPreview ? (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-0 left-0 right-0 z-50 bg-primary text-primary-foreground text-center text-sm py-2 px-4 flex items-center justify-center gap-2"
    >
      <Eye className="w-4 h-4" />
      You're previewing as a student
    </motion.div>
  ) : null;

  const wrapWithBanner = (content: React.ReactNode) => (
    <>
      {teacherBanner}
      {isTeacherPreview && <div className="h-10" />}
      {content}
    </>
  );

  switch (step) {
    case 'intro':
      return wrapWithBanner(<LessonIntro level={userLevel} language={targetLanguage} onStart={() => setStep('video')} />);
    
    case 'video':
      return wrapWithBanner(<LessonVideoPlayer video={videoData} onComplete={() => setStep('exercises')} />);
    
    case 'exercises':
      return wrapWithBanner(<LessonExercises exercises={activeExercises} onComplete={handleExercisesComplete} />);
    
    case 'speaking':
      return wrapWithBanner(
        <LessonSpeaking 
          level={userLevel} 
          phrases={activeSpeakingPhrases}
          videoTranscript={onboardingVideo?.transcript || content.video.transcript}
          language={targetLanguage}
          onComplete={handleSpeakingComplete} 
        />
      );
    
    case 'flashcards':
      return wrapWithBanner(<LessonFlashcards flashcards={activeFlashcards} onComplete={handleFlashcardsComplete} nativeLanguage={nativeLanguage} />);
    
    case 'complete':
      if (isTeacherPreview) {
        // Redirect back to teacher dashboard
        navigate("/teacher", { replace: true });
        return null;
      }
      return (
        <LessonComplete 
          exerciseScore={exerciseScore}
          totalExercises={totalExercises}
          phrasesLearned={phrasesLearned}
          flashcardsLearned={flashcardsLearned}
        />
      );
    
    default:
      return wrapWithBanner(<LessonIntro level={userLevel} language={targetLanguage} onStart={() => setStep('video')} />);
  }
};

export default FirstLesson;
