import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowDown, BookOpen, Sparkles, Play, X, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export type TutorialStep =
  | 'video-pause'      // Step 1: Video paused, show "go to transcript"
  | 'highlight-word'   // Step 2: Scrolled to transcript, word highlighted
  | 'force-explore'    // Step 3: Selection popover shown, force "Explore"
  | 'explorer-open'    // Step 4: Word explorer is open, show tooltip
  | 'save-from-explorer' // Step 5: Point at "Save as Flashcard" in explorer
  | 'flashcard-modal'  // Step 6: Flashcard modal open, prompt to save
  | 'resume-video'     // Step 7: All done, resume video
  | 'completed';

interface TranscriptTutorialProps {
  step: TutorialStep;
  onAdvance: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

const STEP_CONFIG: Record<Exclude<TutorialStep, 'completed'>, {
  title: string;
  description: string;
  action?: string;
  icon: React.ElementType;
  position: 'center' | 'bottom' | 'top';
}> = {
  'video-pause': {
    title: '📖 Explore the Transcript!',
    description: 'Scroll down to see the transcript. You can tap any word to learn more about it!',
    action: 'Go to Transcript',
    icon: ArrowDown,
    position: 'center',
  },
  'highlight-word': {
    title: '✨ Tap a Highlighted Word',
    description: 'We\'ve highlighted an interesting word for you. Tap it to explore its meaning!',
    icon: BookOpen,
    position: 'bottom',
  },
  'force-explore': {
    title: '🔍 Explore This Word',
    description: 'Tap "Explore" to see the full word analysis — translation, conjugation, and more!',
    icon: BookOpen,
    position: 'bottom',
  },
  'explorer-open': {
    title: '📚 Word Explorer',
    description: 'Here you can see translations, conjugations, related words, and more. Take a look!',
    action: 'Got it!',
    icon: BookOpen,
    position: 'top',
  },
  'save-from-explorer': {
    title: '💾 Save as Flashcard',
    description: 'Tap "Save as Flashcard" to add this word to your personal collection!',
    icon: Sparkles,
    position: 'top',
  },
  'flashcard-modal': {
    title: '✅ Save Your Flashcard',
    description: 'Review the details and save it! You can edit anything before saving.',
    icon: Sparkles,
    position: 'top',
  },
  'resume-video': {
    title: '🎉 Great job!',
    description: 'You just created your first flashcard! Now continue watching the video.',
    action: 'Continue Video',
    icon: Play,
    position: 'center',
  },
};

export function TranscriptTutorial({ step, onAdvance, onSkip, onComplete }: TranscriptTutorialProps) {
  const [showSkip, setShowSkip] = useState(false);

  // Show skip button after 3 seconds
  useEffect(() => {
    setShowSkip(false);
    const timer = setTimeout(() => setShowSkip(true), 3000);
    return () => clearTimeout(timer);
  }, [step]);

  if (step === 'completed') return null;

  const config = STEP_CONFIG[step];
  if (!config) return null;

  const Icon = config.icon;

  const handleAction = () => {
    if (step === 'resume-video') {
      onComplete();
    } else {
      onAdvance();
    }
  };

  // Steps that show as a centered overlay with backdrop
  const isCentered = config.position === 'center';
  // Steps that are just floating tooltips (no blocking backdrop)
  const isFloating = config.position === 'bottom' || config.position === 'top';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={step}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className={cn(
          'fixed inset-0 z-[100]',
          isCentered && 'bg-black/50 flex items-center justify-center p-4',
          isFloating && 'pointer-events-none'
        )}
        onClick={isCentered ? undefined : undefined}
      >
        {isCentered ? (
          /* Full-screen overlay with centered card */
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-card border rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 pointer-events-auto"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{config.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{config.description}</p>

            {step === 'video-pause' && (
              <motion.div
                animate={{ y: [0, 8, 0] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="flex justify-center"
              >
                <ArrowDown className="w-8 h-8 text-primary" />
              </motion.div>
            )}

            <div className="flex flex-col gap-2">
              {config.action && (
                <Button onClick={handleAction} className="w-full gap-2">
                  {config.action}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              )}
              <AnimatePresence>
                {showSkip && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                  >
                    <button
                      onClick={onSkip}
                      className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
                    >
                      Skip tutorial
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* Floating tooltip at bottom of screen */
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className={cn(
              'fixed left-3 right-3 z-[101] pointer-events-auto',
              config.position === 'bottom' && 'bottom-4',
              config.position === 'top' && 'top-16'
            )}
          >
            <div className="bg-card border rounded-xl shadow-xl p-4 space-y-3 max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{config.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{config.description}</p>
                </div>
                <AnimatePresence>
                  {showSkip && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <button
                        onClick={onSkip}
                        className="text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {config.action && (
                <Button size="sm" onClick={handleAction} className="w-full gap-2">
                  {config.action}
                  <ChevronRight className="w-3 h-3" />
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

export default TranscriptTutorial;
