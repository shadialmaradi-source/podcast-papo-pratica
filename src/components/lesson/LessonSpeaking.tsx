import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Play, Square, Check, ArrowRight, RotateCcw, Volume2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getLanguageSpeechCode } from "@/utils/languageUtils";

interface SpeakingPhrase {
  phrase: string;
  translation: string;
  why: string;
}

interface PhraseResult {
  phrase: string;
  match: boolean;
  confidence: number;
  feedback: string;
  transcription?: string;
}

interface BeginnerAnalysis {
  mode: "beginner";
  transcription: string;
  results: PhraseResult[];
  overallScore: number;
}

interface SummaryAnalysis {
  mode: "summary";
  transcription: string;
  contentScore: number;
  keyIdeasTotal: number;
  keyIdeasMentioned: number;
  strengths: string[];
  improvements: string[];
  toReach100: string[];
}

type AnalysisResult = BeginnerAnalysis | SummaryAnalysis;

interface LessonSpeakingProps {
  level: string;
  phrases: SpeakingPhrase[];
  videoTranscript: string;
  onComplete: () => void;
  language?: string;
}

// Anonymous session tracking utilities
const getAnonymousSessionId = (): string => {
  let sessionId = localStorage.getItem('anonymous_speech_session');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('anonymous_speech_session', sessionId);
  }
  return sessionId;
};

const getAnonymousAttempts = (): number => {
  return parseInt(localStorage.getItem('anonymous_speech_attempts') || '0');
};

const incrementAnonymousAttempts = () => {
  const current = getAnonymousAttempts();
  localStorage.setItem('anonymous_speech_attempts', String(current + 1));
};

const LessonSpeaking = ({ level, phrases, videoTranscript, onComplete, language = "spanish" }: LessonSpeakingProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState<Record<number, boolean>>({});
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summaryTime, setSummaryTime] = useState(30);
  const [summaryRecorded, setSummaryRecorded] = useState(false);
  
  // Auth and limits
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [anonymousAttempts, setAnonymousAttempts] = useState(getAnonymousAttempts());
  const [limitReached, setLimitReached] = useState(false);
  
  // New states for AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [phraseResults, setPhraseResults] = useState<Record<number, PhraseResult>>({});
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdvancedLevel = level === 'intermediate' || level === 'advanced';
  const maxFreeAttempts = 2;
  const remainingAttempts = maxFreeAttempts - anonymousAttempts;

  // Check authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (!session && anonymousAttempts >= maxFreeAttempts) {
        setLimitReached(true);
      }
    });
  }, [anonymousAttempts]);

  useEffect(() => {
    if (isAdvancedLevel) {
      setIsSummaryMode(true);
    }
  }, [isAdvancedLevel]);

  useEffect(() => {
    if (isSummaryMode && isRecording && summaryTime > 0) {
      timerRef.current = setTimeout(() => {
        setSummaryTime(prev => prev - 1);
      }, 1000);
    } else if (summaryTime === 0 && isRecording) {
      stopRecording();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isSummaryMode, isRecording, summaryTime]);

  const playAudio = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLanguageSpeechCode(language);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzeSpeech = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const audioBase64 = await blobToBase64(audioBlob);
      
      // Get session for auth header
      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/speech-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlenB6aWhudmJsempyZHpnaW9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYzODExNjksImV4cCI6MjA3MTk1NzE2OX0.LKxauwcMH0HaT-DeoBNG5mH7rneI8OiyfSQGrYG1R4M'}`,
        },
        body: JSON.stringify({
          audioBase64,
          mode: isSummaryMode ? 'summary' : 'beginner',
          phrases: isSummaryMode ? undefined : phrases.map(p => p.phrase),
          videoTranscript: isSummaryMode ? videoTranscript : undefined,
          sessionId: !session ? getAnonymousSessionId() : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 403 && errorData.limitReached) {
          setLimitReached(true);
          throw new Error('Free tries exhausted. Sign up for unlimited speaking practice!');
        }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        throw new Error(errorData.error || 'Analysis failed. Please try again.');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResults(result);

      // Update local anonymous attempts counter
      if (!session) {
        incrementAnonymousAttempts();
        setAnonymousAttempts(prev => prev + 1);
      }

      // For beginner mode, update individual phrase results with transcription
      if (result.mode === 'beginner' && result.results && result.results[currentIndex]) {
        setPhraseResults(prev => ({
          ...prev,
          [currentIndex]: {
            ...result.results[currentIndex],
            transcription: result.transcription
          }
        }));
        setHasRecorded(prev => ({ ...prev, [currentIndex]: true }));
      } else if (result.mode === 'summary') {
        setSummaryRecorded(true);
      }

      toast.success('Speech analyzed successfully!');
    } catch (err) {
      console.error('Speech analysis error:', err);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during analysis';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    // Check anonymous limit before starting
    if (!isAuthenticated && anonymousAttempts >= maxFreeAttempts) {
      setLimitReached(true);
      toast.error('Sign up to continue practicing speaking!');
      return;
    }

    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine mime type support
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        stream.getTracks().forEach(track => track.stop());
        
        // Only analyze if we have audio data
        if (audioBlob.size > 0) {
          await analyzeSpeech(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Determine auto-stop duration:
      // - 30 seconds for authenticated users in summary mode
      // - 5 seconds for everyone else (beginner, anonymous, flashcard)
      const maxDuration = (isAuthenticated && isSummaryMode) ? 30000 : 5000;
      
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          stopRecording();
        }
      }, maxDuration);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Microphone access denied. Please enable microphone permissions in your browser settings.');
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleNext = () => {
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setAnalysisResults(null);
    } else {
      onComplete();
    }
  };

  const handleRetry = () => {
    if (isSummaryMode) {
      setSummaryRecorded(false);
      setSummaryTime(30);
      setAnalysisResults(null);
    } else {
      setHasRecorded(prev => {
        const updated = { ...prev };
        delete updated[currentIndex];
        return updated;
      });
      setPhraseResults(prev => {
        const updated = { ...prev };
        delete updated[currentIndex];
        return updated;
      });
      setAnalysisResults(null);
    }
    setError(null);
  };

  const allPhrasesRecorded = Object.keys(hasRecorded).length === phrases.length;

  // Signup prompt for anonymous users who hit the limit
  const SignupPrompt = () => (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-6 text-center space-y-4">
        <h3 className="font-semibold text-lg text-foreground">Want more speaking practice?</h3>
        <p className="text-muted-foreground">
          Sign up free to unlock unlimited AI-powered feedback on your pronunciation
        </p>
        <Button asChild className="w-full sm:w-auto">
          <Link to="/auth">Create Free Account</Link>
        </Button>
        <Button variant="ghost" onClick={onComplete} className="w-full sm:w-auto">
          Continue without speaking
        </Button>
      </CardContent>
    </Card>
  );

  // Remaining tries indicator for anonymous users
  const RemainingTriesIndicator = () => {
    if (isAuthenticated || isAuthenticated === null) return null;
    if (limitReached) return null;
    
    return (
      <p className="text-sm text-muted-foreground text-center">
        {remainingAttempts} free {remainingAttempts === 1 ? 'try' : 'tries'} remaining.{' '}
        <Link to="/auth" className="text-primary hover:underline">
          Sign up for unlimited practice
        </Link>
      </p>
    );
  };

  // Show signup prompt if limit reached
  if (limitReached && !isAuthenticated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Speaking Practice
            </h1>
            <p className="text-muted-foreground">
              You've used your free tries
            </p>
          </div>
          <SignupPrompt />
        </div>
      </motion.div>
    );
  }

  // Summary mode for intermediate/advanced
  if (isSummaryMode) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
      >
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Speaking Practice
            </h1>
            <p className="text-muted-foreground">
              Summarize what happened in the video
            </p>
          </div>

          <RemainingTriesIndicator />

          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <h3 className="font-semibold text-foreground mb-2">Your task:</h3>
                <p className="text-muted-foreground">
                  Summarize what happened in the video in {isAuthenticated ? '20-30' : '5'} seconds using Spanish. 
                  Include the main characters, setting, and key events.
                </p>
              </div>

              {/* Error display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="text-destructive/80 text-sm">{error}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setError(null)}>
                    Dismiss
                  </Button>
                </motion.div>
              )}

              {/* Loading state */}
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center space-y-4 py-8"
                >
                  <Loader2 className="w-16 h-16 mx-auto text-primary animate-spin" />
                  <p className="text-muted-foreground">Analyzing your speech...</p>
                </motion.div>
              )}

              {!summaryRecorded && !isAnalyzing && !error ? (
                <div className="text-center space-y-6">
                  {/* Timer */}
                  <div className={`text-5xl font-bold ${summaryTime <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                    {summaryTime}s
                  </div>

                  {/* Recording button */}
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all ${
                      isRecording 
                        ? 'bg-destructive animate-pulse' 
                        : 'bg-primary hover:bg-primary/90'
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-10 h-10 text-destructive-foreground" />
                    ) : (
                      <Mic className="w-10 h-10 text-primary-foreground" />
                    )}
                  </motion.button>

                  <p className="text-muted-foreground">
                    {isRecording ? 'Tap to stop' : 'Tap to start recording'}
                  </p>
                </div>
              ) : summaryRecorded && analysisResults && analysisResults.mode === 'summary' && !isAnalyzing ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  {/* Score header */}
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">
                      {analysisResults.contentScore}%
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Content Coverage ({analysisResults.keyIdeasMentioned}/{analysisResults.keyIdeasTotal} key ideas)
                    </p>
                  </div>

                  {/* What you said */}
                  <div className="bg-muted/50 rounded-xl p-4">
                    <h4 className="font-medium text-foreground mb-2">What you said:</h4>
                    <p className="text-muted-foreground text-sm italic">"{analysisResults.transcription}"</p>
                  </div>

                  {/* Strengths */}
                  {analysisResults.strengths.length > 0 && (
                    <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                      <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5" /> Strengths
                      </h4>
                      <ul className="space-y-1">
                        {analysisResults.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Improvements */}
                  {analysisResults.improvements.length > 0 && (
                    <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/20">
                      <h4 className="font-semibold text-amber-600 dark:text-amber-500 flex items-center gap-2 mb-2">
                        <AlertCircle className="w-5 h-5" /> Areas to Improve
                      </h4>
                      <ul className="space-y-1">
                        {analysisResults.improvements.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• {s}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* To reach 100% */}
                  {analysisResults.toReach100.length > 0 && (
                    <div className="bg-card rounded-xl p-4 border">
                      <h4 className="font-semibold text-foreground flex items-center gap-2 mb-2">
                        🎯 To reach 100%
                      </h4>
                      <ul className="space-y-1">
                        {analysisResults.toReach100.map((s, i) => (
                          <li key={i} className="text-sm text-muted-foreground">• Say: "{s}"</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleRetry}
                      className="flex-1"
                      disabled={!isAuthenticated && anonymousAttempts >= maxFreeAttempts}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button
                      onClick={onComplete}
                      className="flex-1 bg-primary hover:bg-primary/90"
                    >
                      Continue
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </motion.div>
              ) : null}
            </CardContent>
          </Card>

          {/* Skip speaking button */}
          <div className="text-center pt-2">
            <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">
              Skip Speaking Practice
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Phrase repetition mode for beginners
  const currentPhrase = phrases[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Speaking Practice
          </h1>
          <p className="text-muted-foreground">
            Repeat each phrase after listening
          </p>
        </div>

        <RemainingTriesIndicator />

        {/* Progress */}
        <div className="flex justify-center gap-2">
          {phrases.map((_, idx) => (
            <div
              key={idx}
              className={`w-3 h-3 rounded-full transition-all ${
                hasRecorded[idx]
                  ? 'bg-primary'
                  : idx === currentIndex
                    ? 'bg-primary/50'
                    : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <Card className="shadow-xl rounded-2xl border-0">
              <CardContent className="p-6 md:p-8 space-y-6">
                {/* Phrase display */}
                <div className="text-center space-y-3">
                  <div className="bg-primary/5 rounded-2xl p-6 border border-primary/20">
                    <p className="text-2xl md:text-3xl font-bold text-foreground">
                      {currentPhrase.phrase}
                    </p>
                  </div>
                  
                  <p className="text-muted-foreground">
                    {currentPhrase.translation}
                  </p>
                  
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-sm text-muted-foreground">
                      <strong>Why learn this:</strong> {currentPhrase.why}
                    </p>
                  </div>
                </div>

                {/* Error display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-destructive/80 text-sm">{error}</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setError(null)}>
                      Dismiss
                    </Button>
                  </motion.div>
                )}

                {/* Loading state */}
                {isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center space-y-4 py-4"
                  >
                    <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
                    <p className="text-muted-foreground">Analyzing your pronunciation...</p>
                  </motion.div>
                )}

                {/* Controls */}
                {!hasRecorded[currentIndex] && !isAnalyzing && !error ? (
                  <div className="flex flex-col items-center gap-4">
                    {/* Listen button */}
                    <Button
                      variant="outline"
                      onClick={() => playAudio(currentPhrase.phrase)}
                      className="w-full max-w-xs"
                    >
                      <Volume2 className="w-4 h-4 mr-2" />
                      Listen
                    </Button>

                    {/* Recording button */}
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                        isRecording 
                          ? 'bg-destructive animate-pulse' 
                          : 'bg-primary hover:bg-primary/90'
                      }`}
                    >
                      {isRecording ? (
                        <Square className="w-8 h-8 text-destructive-foreground" />
                      ) : (
                        <Mic className="w-8 h-8 text-primary-foreground" />
                      )}
                    </motion.button>

                    <p className="text-sm text-muted-foreground">
                      {isRecording ? 'Recording... (5 seconds)' : 'Tap to record your pronunciation'}
                    </p>
                  </div>
                ) : phraseResults[currentIndex] && !isAnalyzing ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Result */}
                    <div className={`rounded-xl p-4 text-center ${
                      phraseResults[currentIndex].match
                        ? 'bg-primary/10 border border-primary/20'
                        : 'bg-amber-500/10 border border-amber-500/20'
                    }`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {phraseResults[currentIndex].match ? (
                          <Check className="w-6 h-6 text-primary" />
                        ) : (
                          <AlertCircle className="w-6 h-6 text-amber-500" />
                        )}
                        <span className="text-2xl font-bold">
                          {phraseResults[currentIndex].confidence}%
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {phraseResults[currentIndex].feedback}
                      </p>
                      {phraseResults[currentIndex].transcription && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          You said: "{phraseResults[currentIndex].transcription}"
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        onClick={handleRetry}
                        className="flex-1"
                        disabled={!isAuthenticated && anonymousAttempts >= maxFreeAttempts}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      <Button
                        onClick={handleNext}
                        className="flex-1 bg-primary hover:bg-primary/90"
                      >
                        {currentIndex < phrases.length - 1 ? 'Next Phrase' : 'Continue'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                ) : null}

                {/* Navigation for skipping */}
                {!hasRecorded[currentIndex] && !isRecording && !isAnalyzing && (
                  <div className="flex justify-between pt-4 border-t">
                    <Button
                      variant="ghost"
                      onClick={() => currentIndex > 0 && setCurrentIndex(prev => prev - 1)}
                      disabled={currentIndex === 0}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={handleNext}
                    >
                      Skip
                      <ArrowRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Complete button when all done */}
        {allPhrasesRecorded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <Button
              size="lg"
              onClick={onComplete}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              Continue to Flashcards
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Skip speaking button (always visible in phrase mode) */}
        {!allPhrasesRecorded && (
          <div className="text-center pt-2">
            <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">
              Skip Speaking Practice
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LessonSpeaking;
