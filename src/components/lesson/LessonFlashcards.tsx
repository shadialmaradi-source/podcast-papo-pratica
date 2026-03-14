import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ArrowRight, RotateCw, Check, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getLanguageFlag, normalizeLanguageCode } from "@/utils/languageUtils";
import { trackEvent } from "@/lib/analytics";

interface Flashcard {
  phrase: string;
  translation: string | Record<string, string>;
  why: string | Record<string, string>;
  cardLanguage?: string;
}

const getLocalizedText = (field: string | Record<string, string>, lang: string): string => {
  if (typeof field === 'string') return field;
  return field[lang] || field['en'] || Object.values(field)[0] || '';
};

interface LessonFlashcardsProps {
  flashcards: Flashcard[];
  onComplete: () => void;
  onExit?: () => void;
  language?: string;
  nativeLanguage?: string;
}

const getNativeLanguageFlag = (code: string): string => {
  const flags: Record<string, string> = {
    en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', it: '🇮🇹',
    english: '🇬🇧', spanish: '🇪🇸', portuguese: '🇧🇷', french: '🇫🇷', italian: '🇮🇹',
  };
  return flags[code?.toLowerCase()] || '🌐';
};

const LessonFlashcards = ({ flashcards, onComplete, onExit, language = "english", nativeLanguage = "en" }: LessonFlashcardsProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [learned, setLearned] = useState<Record<number, boolean>>({});

  const currentCard = flashcards[currentIndex];
  const progress = flashcards.length > 0 ? ((currentIndex + 1) / flashcards.length) * 100 : 0;

  if (!currentCard || flashcards.length === 0) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="text-center space-y-4">
          <BookOpen className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">No flashcards available</p>
          <Button onClick={onComplete}>Continue</Button>
        </div>
      </div>
    );
  }

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
      className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col"
    >
      <div className="flex-1 overflow-auto p-3 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
          {/* Exit button */}
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit} className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Exit
            </Button>
          )}

          <div className="text-center space-y-1 md:space-y-2">
            <h1 className="text-xl md:text-3xl font-bold text-foreground">
              <BookOpen className="w-6 h-6 md:w-8 md:h-8 inline-block mr-2 text-primary" />
              Flashcards
            </h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Review key phrases from the lesson
            </p>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs md:text-sm text-muted-foreground">
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
                className={`shadow-xl rounded-2xl border-0 cursor-pointer min-h-[220px] md:min-h-[300px] transition-all duration-300 ${
                  learned[currentIndex] ? 'ring-2 ring-primary ring-offset-2' : ''
                }`}
                onClick={handleFlip}
              >
                <CardContent className="p-5 md:p-8 h-full flex flex-col items-center justify-center text-center">
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.4 }}
                    className="w-full"
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {!isFlipped ? (
                      // Front - Target language phrase
                      <div className="space-y-4 md:space-y-6">
                        <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xl md:text-2xl">{getLanguageFlag(currentCard.cardLanguage || language)}</span>
                        </div>
                        <p className="text-xl md:text-3xl font-bold text-foreground">
                          {currentCard.phrase}
                        </p>
                        <p className="text-muted-foreground text-xs md:text-sm">
                          Tap to reveal translation
                        </p>
                      </div>
                    ) : (
                      // Back - Translation + Why
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-4 md:space-y-6"
                        style={{ transform: 'rotateY(180deg)' }}
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-xl md:text-2xl">{getNativeLanguageFlag(nativeLanguage)}</span>
                        </div>
                         <p className="text-xl md:text-3xl font-bold text-foreground">
                           {getLocalizedText(currentCard.translation, nativeLanguage)}
                         </p>
                         <div className="bg-primary/5 rounded-xl p-3 md:p-4 border border-primary/20">
                           <p className="text-xs md:text-sm text-muted-foreground">
                             <span className="text-primary font-medium">Why this matters:</span><br />
                             {getLocalizedText(currentCard.why, nativeLanguage)}
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
          <div className="flex justify-center gap-3 md:gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleFlip}
              className="gap-2 rounded-full text-sm md:text-base"
            >
              <RotateCw className="w-4 h-4 md:w-5 md:h-5" />
              Flip
            </Button>

            {isFlipped && !learned[currentIndex] && (
              <Button
                size="lg"
                onClick={handleMarkLearned}
                className="bg-primary hover:bg-primary/90 gap-2 rounded-full text-sm md:text-base"
              >
                <Check className="w-4 h-4 md:w-5 md:h-5" />
                Learned
              </Button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-1 md:gap-2 pt-2 md:pt-4">
            {flashcards.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setIsFlipped(false);
                  setCurrentIndex(idx);
                }}
                className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full transition-all ${
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
      </div>

      {/* Sticky Navigation */}
      <div className="sticky bottom-0 p-3 md:p-6 bg-background/80 backdrop-blur border-t md:border-0">
        <div className="max-w-2xl mx-auto flex justify-between">
          <Button
            variant="ghost"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            size="sm"
          >
            Previous
          </Button>

          {currentIndex < flashcards.length - 1 ? (
            <Button
              variant="ghost"
              onClick={handleNext}
              size="sm"
            >
              Skip
              <ArrowRight className="w-4 h-4 ml-1 md:ml-2" />
            </Button>
          ) : (
            <Button
              onClick={onComplete}
              className="bg-primary hover:bg-primary/90 gap-1 md:gap-2"
            >
              Complete Lesson
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LessonFlashcards;
