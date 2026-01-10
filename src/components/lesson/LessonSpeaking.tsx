import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Play, Square, Check, ArrowRight, RotateCcw, Volume2, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

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
}

const LessonSpeaking = ({ level, phrases, videoTranscript, onComplete }: LessonSpeakingProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState<Record<number, boolean>>({});
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summaryTime, setSummaryTime] = useState(30);
  const [summaryRecorded, setSummaryRecorded] = useState(false);
  
  // New states for AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [phraseResults, setPhraseResults] = useState<Record<number, PhraseResult>>({});
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isAdvancedLevel = level === 'intermediate' || level === 'advanced';

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
    utterance.lang = 'es-ES';
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

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          audioBase64,
          mode: isSummaryMode ? 'summary' : 'beginner',
          phrases: isSummaryMode ? undefined : phrases.map(p => p.phrase),
          videoTranscript: isSummaryMode ? videoTranscript : undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        if (response.status === 402) {
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Analysis failed. Please try again.');
      }

      const result: AnalysisResult = await response.json();
      setAnalysisResults(result);

      // For beginner mode, update individual phrase results
      if (result.mode === 'beginner' && result.results && result.results[currentIndex]) {
        setPhraseResults(prev => ({
          ...prev,
          [currentIndex]: result.results[currentIndex]
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
      
      // Auto-stop for beginner mode after 5 seconds
      if (!isSummaryMode) {
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
          }
        }, 5000);
      }
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

          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                <h3 className="font-semibold text-foreground mb-2">Your task:</h3>
                <p className="text-muted-foreground">
                  Summarize what happened in the video in 20-30 seconds using Spanish. 
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
                <div className="text-center space-y-4">
                  <div className="bg-primary/5 rounded-2xl p-6">
                    <p className="text-2xl md:text-3xl font-bold text-foreground">
                      "{currentPhrase.phrase}"
                    </p>
                    <p className="text-muted-foreground mt-2">
                      {currentPhrase.translation}
                    </p>
                  </div>

                  <div className="bg-card rounded-xl p-4 border">
                    <p className="text-sm text-muted-foreground">
                      <span className="text-primary font-medium">Why this matters:</span>{' '}
                      {currentPhrase.why}
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

                {/* Audio controls - hide when analyzing */}
                {!isAnalyzing && (
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      size="lg"
                      onClick={() => playAudio(currentPhrase.phrase)}
                      className="gap-2 rounded-full"
                    >
                      <Volume2 className="w-5 h-5" />
                      Listen
                    </Button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={hasRecorded[currentIndex]}
                      className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                        isRecording 
                          ? 'bg-destructive animate-pulse' 
                          : hasRecorded[currentIndex]
                            ? 'bg-primary'
                            : 'bg-primary hover:bg-primary/90'
                      } ${hasRecorded[currentIndex] ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      {isRecording ? (
                        <Square className="w-7 h-7 text-destructive-foreground" />
                      ) : hasRecorded[currentIndex] ? (
                        <Check className="w-7 h-7 text-primary-foreground" />
                      ) : (
                        <Mic className="w-7 h-7 text-primary-foreground" />
                      )}
                    </motion.button>
                  </div>
                )}

                {/* Phrase result feedback */}
                {phraseResults[currentIndex] && !isAnalyzing && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center space-y-3"
                  >
                    <div className={`flex items-center justify-center gap-2 ${
                      phraseResults[currentIndex].match ? 'text-primary' : 'text-amber-500'
                    }`}>
                      {phraseResults[currentIndex].match ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <RotateCcw className="w-6 h-6" />
                      )}
                      <span className="font-medium">
                        {phraseResults[currentIndex].feedback}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {phraseResults[currentIndex].confidence}%
                    </p>
                    
                    {!phraseResults[currentIndex].match && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className="mt-2"
                      >
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                    )}
                  </motion.div>
                )}

                {!isAnalyzing && !phraseResults[currentIndex] && (
                  <p className="text-center text-sm text-muted-foreground">
                    {isRecording ? 'Recording... tap to stop (5s max)' : 'Tap the microphone to record'}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentIndex(prev => prev - 1);
              setAnalysisResults(null);
            }}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          {hasRecorded[currentIndex] && (
            <Button
              onClick={handleNext}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              {currentIndex === phrases.length - 1 ? 'Continue' : 'Next Phrase'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {allPhrasesRecorded && currentIndex === phrases.length - 1 && (
          <div className="text-center">
            <Button
              onClick={onComplete}
              size="lg"
              className="bg-primary hover:bg-primary/90 rounded-full px-8"
            >
              Continue to Flashcards
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default LessonSpeaking;
