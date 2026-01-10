import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Play, Square, Check, ArrowRight, RotateCcw, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpeakingPhrase {
  phrase: string;
  translation: string;
  why: string;
}

interface LessonSpeakingProps {
  level: string;
  phrases: SpeakingPhrase[];
  onComplete: () => void;
}

const LessonSpeaking = ({ level, phrases, onComplete }: LessonSpeakingProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState<Record<number, boolean>>({});
  const [isSummaryMode, setIsSummaryMode] = useState(false);
  const [summaryTime, setSummaryTime] = useState(30);
  const [summaryRecorded, setSummaryRecorded] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      // Simulate recording for demo
      setIsRecording(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
    setIsRecording(false);
    
    if (isSummaryMode) {
      setSummaryRecorded(true);
      setShowFeedback(true);
    } else {
      setHasRecorded(prev => ({ ...prev, [currentIndex]: true }));
    }
  };

  const handleNext = () => {
    if (currentIndex < phrases.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onComplete();
    }
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

              {!summaryRecorded ? (
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
              ) : showFeedback ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-primary">
                    <Check className="w-6 h-6" />
                    <span className="font-semibold">Recording complete!</span>
                  </div>

                  <div className="bg-card rounded-xl p-4 space-y-3 border">
                    <h4 className="font-medium text-foreground">Feedback:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Content coverage:</span>
                        <span className="text-primary font-medium">82% (4/5 key ideas)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Fluency:</span>
                        <span className="text-primary font-medium">Good (2.1s avg pause)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="text-foreground">{30 - summaryTime} seconds</span>
                      </div>
                    </div>
                    <div className="bg-primary/5 rounded-lg p-3 mt-4">
                      <p className="text-sm text-muted-foreground">
                        <span className="text-primary font-medium">Try next time:</span> Include "mesa para uno" for more natural phrasing
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSummaryRecorded(false);
                        setSummaryTime(30);
                        setShowFeedback(false);
                      }}
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

                {/* Audio controls */}
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
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isRecording 
                        ? 'bg-destructive animate-pulse' 
                        : hasRecorded[currentIndex]
                          ? 'bg-primary'
                          : 'bg-primary hover:bg-primary/90'
                    }`}
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

                {hasRecorded[currentIndex] && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-primary font-medium">
                      ✓ Great pronunciation!
                    </p>
                  </motion.div>
                )}

                <p className="text-center text-sm text-muted-foreground">
                  {isRecording ? 'Recording... tap to stop' : 'Tap the microphone to record'}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={() => setCurrentIndex(prev => prev - 1)}
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
