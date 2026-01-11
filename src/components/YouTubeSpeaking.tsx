import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Play, Square, Check, ArrowRight, RotateCcw, Volume2, AlertCircle, Loader2, ArrowLeft, SkipForward } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

interface YouTubeSpeakingProps {
  videoId: string;
  level: string;
  onComplete: () => void;
  onBack: () => void;
}

export function YouTubeSpeaking({ videoId, level, onComplete, onBack }: YouTubeSpeakingProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [phrases, setPhrases] = useState<SpeakingPhrase[]>([]);
  const [transcript, setTranscript] = useState<string>("");
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState<Record<number, boolean>>({});
  const [summaryTime, setSummaryTime] = useState(30);
  const [summaryRecorded, setSummaryRecorded] = useState(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [phraseResults, setPhraseResults] = useState<Record<number, PhraseResult>>({});
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isSummaryMode = level === 'intermediate' || level === 'advanced';

  // Fetch transcript and extract phrases on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Get video record first
        let videoRecord = await supabase
          .from('youtube_videos')
          .select('id')
          .eq('video_id', videoId)
          .single();
          
        if (!videoRecord.data) {
          videoRecord = await supabase
            .from('youtube_videos')
            .select('id')
            .eq('id', videoId)
            .single();
        }
        
        if (!videoRecord.data) {
          throw new Error("Video not found");
        }
        
        // Fetch transcript
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('youtube_transcripts')
          .select('transcript, language')
          .eq('video_id', videoRecord.data.id)
          .single();
          
        if (transcriptError || !transcriptData?.transcript) {
          throw new Error("Transcript not found for this video");
        }
        
        setTranscript(transcriptData.transcript);
        
        // For beginners, extract key phrases
        if (!isSummaryMode) {
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/extract-speaking-phrases`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              transcript: transcriptData.transcript,
              level,
              language: transcriptData.language
            }),
          });
          
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || "Failed to extract phrases");
          }
          
          const phraseData = await response.json();
          setPhrases(phraseData.phrases || []);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading speaking data:', err);
        setError(err instanceof Error ? err.message : "Failed to load speaking practice");
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [videoId, level, isSummaryMode]);

  // Timer for summary mode
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
    setAnalysisError(null);

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
          videoTranscript: isSummaryMode ? transcript : undefined,
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
      setAnalysisError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startRecording = async () => {
    try {
      setAnalysisError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
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
        
        if (audioBlob.size > 0) {
          await analyzeSpeech(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      if (!isSummaryMode) {
        setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            stopRecording();
          }
        }, 5000);
      }
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setAnalysisError('Microphone access denied. Please enable microphone permissions in your browser settings.');
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

  const handleSkip = () => {
    setHasRecorded(prev => ({ ...prev, [currentIndex]: true }));
    setPhraseResults(prev => ({
      ...prev,
      [currentIndex]: {
        phrase: phrases[currentIndex]?.phrase || '',
        match: false,
        confidence: 0,
        feedback: 'Skipped',
        transcription: '(Skipped)'
      }
    }));
    handleNext();
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
    setAnalysisError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-8 text-center space-y-4">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <div>
                <h3 className="font-semibold text-lg">Preparing Speaking Practice</h3>
                <p className="text-muted-foreground text-sm">
                  {isSummaryMode ? "Loading video transcript..." : "Extracting key phrases from the video..."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
              <div>
                <h3 className="font-semibold text-lg">Unable to Load Speaking Practice</h3>
                <p className="text-muted-foreground text-sm">{error}</p>
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={onBack}>Go Back</Button>
                <Button onClick={onComplete}>Skip Speaking Practice</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>

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
                  Summarize what you learned from the video in 25-30 seconds. 
                  Include the main topic, key points, and any important details.
                </p>
              </div>

              {analysisError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center"
                >
                  <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">Error</span>
                  </div>
                  <p className="text-destructive/80 text-sm">{analysisError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setAnalysisError(null)}>
                    Dismiss
                  </Button>
                </motion.div>
              )}

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

              {!summaryRecorded && !isAnalyzing && !analysisError ? (
                <div className="text-center space-y-6">
                  <div className={`text-5xl font-bold ${summaryTime <= 10 ? 'text-destructive' : 'text-foreground'}`}>
                    {summaryTime}s
                  </div>

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

                  <Button variant="ghost" onClick={onComplete} className="text-muted-foreground">
                    <SkipForward className="w-4 h-4 mr-2" />
                    Skip speaking practice
                  </Button>
                </div>
              ) : summaryRecorded && analysisResults && analysisResults.mode === 'summary' && !isAnalyzing ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary">
                      {analysisResults.contentScore}%
                    </div>
                    <p className="text-muted-foreground mt-1">
                      Content Coverage ({analysisResults.keyIdeasMentioned}/{analysisResults.keyIdeasTotal} key ideas)
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4">
                    <h4 className="font-medium text-foreground mb-2">What you said:</h4>
                    <p className="text-muted-foreground text-sm italic">"{analysisResults.transcription}"</p>
                  </div>

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
                    <Button variant="outline" onClick={handleRetry} className="flex-1">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button onClick={onComplete} className="flex-1 bg-primary hover:bg-primary/90">
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
  const currentResult = phraseResults[currentIndex];

  if (!currentPhrase) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <Button variant="outline" onClick={onBack} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Results
          </Button>
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 mx-auto text-amber-500" />
              <div>
                <h3 className="font-semibold text-lg">No Phrases Available</h3>
                <p className="text-muted-foreground text-sm">
                  We couldn't extract phrases from this video. Try another video or skip this section.
                </p>
              </div>
              <Button onClick={onComplete}>Continue</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <Button variant="outline" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Results
        </Button>

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
                    <p className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                      "{currentPhrase.phrase}"
                    </p>
                    <p className="text-muted-foreground">
                      "{currentPhrase.translation}"
                    </p>
                  </div>

                  <div className="bg-muted/50 rounded-xl p-4">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Why learn this:</span> {currentPhrase.why}
                    </p>
                  </div>
                </div>

                {/* Error display */}
                {analysisError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-medium">Error</span>
                    </div>
                    <p className="text-destructive/80 text-sm">{analysisError}</p>
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

                {/* Controls or Results */}
                {!currentResult && !isAnalyzing ? (
                  <div className="space-y-4">
                    <div className="flex justify-center gap-4">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => playAudio(currentPhrase.phrase)}
                        className="rounded-full gap-2"
                      >
                        <Volume2 className="w-5 h-5" />
                        Listen
                      </Button>

                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                          isRecording 
                            ? 'bg-destructive animate-pulse' 
                            : 'bg-primary hover:bg-primary/90'
                        }`}
                      >
                        {isRecording ? (
                          <Square className="w-6 h-6 text-destructive-foreground" />
                        ) : (
                          <Mic className="w-6 h-6 text-primary-foreground" />
                        )}
                      </motion.button>
                    </div>

                    <p className="text-center text-sm text-muted-foreground">
                      {isRecording ? 'Recording... (auto-stops in 5s)' : 'Tap the microphone to record'}
                    </p>

                    <Button
                      variant="ghost"
                      onClick={handleSkip}
                      className="w-full text-muted-foreground"
                    >
                      <SkipForward className="w-4 h-4 mr-2" />
                      Can't speak right now? Skip this phrase
                    </Button>
                  </div>
                ) : currentResult && !isAnalyzing ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Transcription */}
                    {currentResult.transcription && (
                      <div className="bg-muted/50 rounded-xl p-4">
                        <h4 className="font-medium text-foreground mb-1">You said:</h4>
                        <p className="text-muted-foreground italic">"{currentResult.transcription}"</p>
                      </div>
                    )}

                    {/* Result */}
                    <div className={`rounded-xl p-4 ${
                      currentResult.match 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'bg-amber-500/10 border border-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {currentResult.match ? (
                          <Check className="w-5 h-5 text-primary" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-500" />
                        )}
                        <span className="font-semibold">
                          {currentResult.match ? 'Great job!' : 'Keep practicing!'} 
                          {' '}({currentResult.confidence}% match)
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{currentResult.feedback}</p>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={handleRetry} className="flex-1">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Try Again
                      </Button>
                      <Button onClick={handleNext} className="flex-1 bg-primary hover:bg-primary/90">
                        {currentIndex < phrases.length - 1 ? 'Next Phrase' : 'Finish'}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </motion.div>
                ) : null}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {phrases.length > 1 && (
          <div className="flex justify-between">
            <Button
              variant="outline"
              disabled={currentIndex === 0}
              onClick={() => {
                setCurrentIndex(prev => prev - 1);
                setAnalysisResults(null);
              }}
            >
              Previous
            </Button>
            <span className="text-muted-foreground self-center">
              {currentIndex + 1} of {phrases.length}
            </span>
            <Button
              variant="outline"
              disabled={currentIndex === phrases.length - 1}
              onClick={handleNext}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default YouTubeSpeaking;
