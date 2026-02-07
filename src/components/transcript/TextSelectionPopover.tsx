import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, BookOpen, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TextSelectionPopoverProps {
  selectedText: string;
  position: { x: number; y: number };
  onCreateFlashcard: () => void;
  onExploreWord: () => void;
  onDismiss: () => void;
}

export function TextSelectionPopover({
  selectedText,
  position,
  onCreateFlashcard,
  onExploreWord,
  onDismiss,
}: TextSelectionPopoverProps) {
  const adjustedX = Math.max(120, Math.min(position.x, window.innerWidth - 120));
  const adjustedY = Math.max(60, position.y);

  return (
    <AnimatePresence>
      <motion.div
        data-selection-popover
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50"
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="bg-popover border rounded-lg shadow-lg p-1 flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-sm font-medium hover:bg-primary hover:text-primary-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onCreateFlashcard();
            }}
          >
            <Sparkles className="w-4 h-4" />
            Save Flashcard
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onExploreWord();
            }}
          >
            <BookOpen className="w-4 h-4" />
            Explore
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="w-7 h-7 p-0"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDismiss();
            }}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Arrow pointing down */}
        <div
          className="absolute left-1/2 -bottom-1 -translate-x-1/2 w-2 h-2 bg-popover border-b border-r rotate-45"
          style={{ marginBottom: '-1px' }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

export default TextSelectionPopover;
