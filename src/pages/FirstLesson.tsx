import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LessonIntro from "@/components/lesson/LessonIntro";
import LessonVideoPlayer from "@/components/lesson/LessonVideoPlayer";
import LessonExercises from "@/components/lesson/LessonExercises";
import LessonSpeaking from "@/components/lesson/LessonSpeaking";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import LessonComplete from "@/components/lesson/LessonComplete";
import { allLessonContent, getLocalizedContent } from "@/data/firstLessonContent";

type LessonStep = 'intro' | 'video' | 'exercises' | 'speaking' | 'flashcards' | 'complete';

const FirstLesson = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<LessonStep>('intro');
  const [exerciseScore, setExerciseScore] = useState(0);
  const [totalExercises, setTotalExercises] = useState(5);
  const [phrasesLearned, setPhrasesLearned] = useState(0);
  const [flashcardsLearned, setFlashcardsLearned] = useState(0);

  // Get user's selections from localStorage
  const userLevel = localStorage.getItem('onboarding_level') || 'absolute_beginner';
  const targetLanguage = localStorage.getItem('onboarding_language') || 'spanish';
  const nativeLanguage = localStorage.getItem('onboarding_native_language') || 'en';

  // Get content for the selected language and level
  const languageContent = allLessonContent[targetLanguage] || allLessonContent.spanish;
  const rawContent = languageContent[userLevel] || languageContent.absolute_beginner;
  
  // Resolve translations to user's native language
  const content = getLocalizedContent(rawContent, nativeLanguage);

  useEffect(() => {
    localStorage.setItem('lesson_step', step);
  }, [step]);

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
      return <LessonVideoPlayer video={content.video} onComplete={() => setStep('exercises')} />;
    
    case 'exercises':
      return <LessonExercises exercises={content.exercises} onComplete={handleExercisesComplete} />;
    
    case 'speaking':
      return (
        <LessonSpeaking 
          level={userLevel} 
          phrases={content.speakingPhrases}
          videoTranscript={content.video.transcript}
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
