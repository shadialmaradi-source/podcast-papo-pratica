import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, RotateCw, Check, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLanguageFlag } from "@/utils/languageUtils";
import { trackEvent } from "@/lib/analytics";

interface Flashcard {
  phrase: string;
  translation: string;
  why: string;
}

interface LessonFlashcardsProps {
  flashcards: Flashcard[];
  onComplete: () => void;
  language?: string;
}

const LessonFlashcards = ({ flashcards, onComplete, language = "english" }: LessonFlashcardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learned, setLearned] = useState<Record<number, boolean>>({});

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleMarkLearned = () => {
    // Track flashcard review
    trackEvent('flashcard_reviewed', {
      card_index: currentIndex,
      total_cards: flashcards.length,
      marked_learned: true,
      timestamp: new Date().toISOString()
    });
    setLearned(prev => ({ ...prev, [currentIndex]: true }));
    handleNext();
  };

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < flashcards.length - 1) {
      setTimeout(() => setCurrentIndex(prev => prev + 1), 200);
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    if (currentIndex > 0) {
      setTimeout(() => setCurrentIndex(prev => prev - 1), 200);
    }
  };

  const allLearned = Object.keys(learned).length === flashcards.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            <BookOpen className="w-8 h-8 inline-block mr-2 text-primary" />
            Flashcards
          </h1>
          <p className="text-muted-foreground">
            Review key phrases from the lesson
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Card {currentIndex + 1} of {flashcards.length}</span>
            <span>{Object.keys(learned).length} learned</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flashcard */}
        <div className="perspective-1000">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              transition={{ duration: 0.3 }}
            >
              <Card 
                className={`shadow-xl rounded-2xl border-0 cursor-pointer min-h-[300px] transition-all duration-300 ${
                  learned[currentIndex] ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={handleFlip}
              >
                <CardContent className="p-8 h-full flex flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {!isFlipped ? (
                      // Front - Target language phrase
                      <div className="space-y-6">
                        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl">{getLanguageFlag(language)}</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">
                          {currentCard.phrase}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Tap to reveal translation
                        </p>
                      </div>
                    ) : (
                      // Back - Translation + Why
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                        <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-2xl">🇺🇸</span>
                        </div>
                        <p className="text-2xl md:text-3xl font-bold text-foreground">
                          {currentCard.translation}
                        </p>
                        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
                          <p className="text-sm text-muted-foreground">
                            <span className="text-primary font-medium">Why this matters:</span><br />
                            {currentCard.why}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant="outline"
            size="lg"
            onClick={handleFlip}
            className="gap-2 rounded-full"
          >
            <RotateCw className="w-5 h-5" />
            Flip Card
          </Button>

          {isFlipped && !learned[currentIndex] && (
            <Button
              size="lg"
              onClick={handleMarkLearned}
              className="bg-primary hover:bg-primary/90 gap-2 rounded-full"
            >
              <Check className="w-5 h-5" />
              Mark as Learned
            </Button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>

          {currentIndex < flashcards.length - 1 ? (
            <Button
              variant="ghost"
              onClick={handleNext}
            >
              Skip
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onComplete}
              className="bg-primary hover:bg-primary/90 gap-2"
            >
              Complete Lesson
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pt-4">
          {flashcards.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setIsFlipped(false);
                setCurrentIndex(idx);
              }}
              className={`w-3 h-3 rounded-full transition-all ${
                learned[idx]
                  ? 'bg-primary'
                  : idx === currentIndex
                    ? 'bg-primary/50 scale-125'
                    : 'bg-muted hover:bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default LessonFlashcards;
