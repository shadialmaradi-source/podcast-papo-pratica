import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LessonIntro from "@/components/lesson/LessonIntro";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import LessonExercises from "@/components/lesson/LessonExercises";
import LessonSpeaking from "@/components/lesson/LessonSpeaking";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import LessonComplete from "@/components/lesson/LessonComplete";
import { allLessonContent, getLocalizedContent } from "@/data/firstLessonContent";
import { supabase } from "@/integrations/supabase/client";

type LessonStep = 'intro' | 'video' | 'exercises' | 'speaking' | 'flashcards' | 'complete';

interface OnboardingVideo {
  youtube_id: string;
  start_time: number;
  duration: number;
  suggested_speed: number;
  transcript: string | null;
}

const FirstLesson = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LessonStep>('intro');
  const [exerciseScore, setExerciseScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(5);
  const [phrasesLearned, setPhrasesLearned] = useState(0);
  const [flashcardsLearned, setFlashcardsLearned] = useState(0);
  const [onboardingVideo, setOnboardingVideo] = useState<OnboardingVideo | null>(null);

  // Get user's selections from localStorage
  const userLevel = localStorage.getItem('onboarding_level') || 'absolute_beginner';
  const targetLanguage = localStorage.getItem('onboarding_language') || 'spanish';
  const nativeLanguage = localStorage.getItem('onboarding_native_language') || 'en';

  // Get fallback content for the selected language and level
  const languageContent = allLessonContent[targetLanguage] || allLessonContent.spanish;
  const rawContent = languageContent[userLevel] || languageContent.absolute_beginner;
  const content = getLocalizedContent(rawContent, nativeLanguage);

  // Fetch onboarding video from Supabase
  useEffect(() => {
    const fetchVideo = async () => {
      const { data } = await supabase
        .from('onboarding_videos')
        .select('youtube_id, start_time, duration, suggested_speed, transcript')
        .eq('language', targetLanguage)
        .eq('level', userLevel)
        .maybeSingle();
      
      if (data) {
        setOnboardingVideo(data);
      }
    };
    fetchVideo();
  }, [targetLanguage, userLevel]);

  useEffect(() => {
    localStorage.setItem('lesson_step', step);
  }, [step]);

  // Build video data: prefer Supabase, fallback to hardcoded
  const videoData = onboardingVideo
    ? {
        youtubeId: onboardingVideo.youtube_id,
        startTime: onboardingVideo.start_time,
        duration: onboardingVideo.duration,
        suggestedSpeed: onboardingVideo.suggested_speed,
      }
    : content.video;

  const handleExercisesComplete = (score: number, total: number) => {
    setExerciseScore(score);
    setTotalExercises(total);
    setStep('speaking');
  };

  const handleSpeakingComplete = () => {
    setPhrasesLearned(content.speakingPhrases.length);
    setStep('flashcards');
  };

  const handleFlashcardsComplete = () => {
    setFlashcardsLearned(content.flashcards.length);
    localStorage.removeItem('lesson_step');
    setStep('complete');
  };

  switch (step) {
    case 'intro':
      return <LessonIntro level={userLevel} language={targetLanguage} onStart={() => setStep('video')} />;
    
    case 'video':
      return <LessonVideoPlayer video={videoData} onComplete={() => setStep('exercises')} />;
    
    case 'exercises':
      return <LessonExercises exercises={content.exercises} onComplete={handleExercisesComplete} />;
    
    case 'speaking':
      return (
        <LessonSpeaking 
          level={userLevel} 
          phrases={content.speakingPhrases}
          videoTranscript={onboardingVideo?.transcript || content.video.transcript}
          language={targetLanguage}
          onComplete={handleSpeakingComplete} 
        />
      );
    
    case 'flashcards':
      return <LessonFlashcards flashcards={content.flashcards} onComplete={handleFlashcardsComplete} nativeLanguage={nativeLanguage} />;
    
    case 'complete':
      return (
        <LessonComplete 
          exerciseScore={exerciseScore}
          totalExercises={totalExercises}
          phrasesLearned={phrasesLearned}
          flashcardsLearned={flashcardsLearned}
        />
      );
    
    default:
      return <LessonIntro level={userLevel} language={targetLanguage} onStart={() => setStep('video')} />;
  }
};

export default FirstLesson;
