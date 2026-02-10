import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TranscriptWordSuggestion } from '@/services/wordAnalysisService';

interface TranscriptLineProps {
  timestamp: string;
  text: string;
  isHighlighted?: boolean;
  savedPhrases?: string[];
  suggestedWords?: TranscriptWordSuggestion[];
  onTimestampClick: (timeSeconds: number) => void;
  onSuggestedWordClick?: (suggestion: TranscriptWordSuggestion) => void;
  timeSeconds: number;
}

export function TranscriptLine({
  timestamp,
  text,
  isHighlighted = false,
  savedPhrases = [],
  suggestedWords = [],
  onTimestampClick,
  onSuggestedWordClick,
  timeSeconds,
}: TranscriptLineProps) {
  const renderTextWithHighlights = () => {
    if (savedPhrases.length === 0 && suggestedWords.length === 0) {
      return text;
    }

    let result: (string | React.ReactNode)[] = [text];

    // First pass: highlight saved phrases (solid underline)
    for (const phrase of savedPhrases) {
      const newResult: (string | React.ReactNode)[] = [];

      for (const part of result) {
        if (typeof part !== 'string') {
          newResult.push(part);
          continue;
        }

        const lowerPart = part.toLowerCase();
        const lowerPhrase = phrase.toLowerCase();
        const index = lowerPart.indexOf(lowerPhrase);

        if (index === -1) {
          newResult.push(part);
        } else {
          if (index > 0) newResult.push(part.substring(0, index));
          newResult.push(
            <span
              key={`saved-${phrase}-${index}-${Math.random()}`}
              className="bg-primary/20 rounded px-0.5 border-b-2 border-primary/40"
              title="Saved to flashcards"
            >
              {part.substring(index, index + phrase.length)}
            </span>
          );
          if (index + phrase.length < part.length) {
            newResult.push(part.substring(index + phrase.length));
          }
        }
      }
      result = newResult;
    }

    // Second pass: highlight suggested words (dashed underline) — only on plain text parts
    for (const suggestion of suggestedWords) {
      const newResult: (string | React.ReactNode)[] = [];

      for (const part of result) {
        if (typeof part !== 'string') {
          newResult.push(part);
          continue;
        }

        const lowerPart = part.toLowerCase();
        const lowerPhrase = suggestion.phrase.toLowerCase();
        const index = lowerPart.indexOf(lowerPhrase);

        if (index === -1) {
          newResult.push(part);
        } else {
          if (index > 0) newResult.push(part.substring(0, index));
          newResult.push(
            <span
              key={`suggested-${suggestion.phrase}-${index}-${Math.random()}`}
              className="border-b-2 border-dashed border-accent-foreground/30 cursor-pointer hover:bg-accent/20 rounded px-1 py-0.5 sm:px-0.5 sm:py-0 transition-colors"
              title={`${suggestion.translation} — ${suggestion.why}`}
              onClick={(e) => {
                e.stopPropagation();
                onSuggestedWordClick?.(suggestion);
              }}
            >
              {part.substring(index, index + suggestion.phrase.length)}
            </span>
          );
          if (index + suggestion.phrase.length < part.length) {
            newResult.push(part.substring(index + suggestion.phrase.length));
          }
        }
      }
      result = newResult;
    }

    return result;
  };

  return (
    <div
      className={cn(
        "group flex gap-3 py-2 px-3 rounded-lg transition-colors select-text",
        isHighlighted && "bg-primary/10 border-l-2 border-primary"
      )}
    >
      <Badge
        variant="outline"
        className={cn(
          "shrink-0 cursor-pointer font-mono text-xs h-6 hover:bg-primary hover:text-primary-foreground transition-colors",
          isHighlighted && "bg-primary/20 border-primary/40"
        )}
        onClick={() => onTimestampClick(timeSeconds)}
      >
        {timestamp}
      </Badge>
      <span className="text-foreground leading-relaxed flex-1">
        {renderTextWithHighlights()}
      </span>
    </div>
  );
}

export default TranscriptLine;
