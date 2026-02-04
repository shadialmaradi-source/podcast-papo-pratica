import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, Minus, Plus, ScrollText } from 'lucide-react';
import { parseTranscript, getCurrentSegmentIndex, type TranscriptSegment } from '@/utils/transcriptUtils';
import { useTextSelection } from '@/hooks/useTextSelection';
import { getSavedPhrasesForVideo } from '@/services/flashcardService';
import { useAuth } from '@/hooks/useAuth';
import TranscriptLine from './TranscriptLine';
import TextSelectionPopover from './TextSelectionPopover';
import FlashcardCreatorModal from './FlashcardCreatorModal';
import LockedTranscript from './LockedTranscript';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TranscriptViewerProps {
  videoId: string;
  transcript: string;
  videoTitle: string;
  language: string;
  isPremium: boolean;
  currentTime?: number; // Current video playback time in seconds
  onSeek?: (timeSeconds: number) => void;
  onUpgradeClick: () => void;
}

type TextSize = 'small' | 'medium' | 'large';

const TEXT_SIZE_CLASSES: Record<TextSize, string> = {
  small: 'text-sm',
  medium: 'text-base',
  large: 'text-lg',
};

export function TranscriptViewer({
  videoId,
  transcript,
  videoTitle,
  language,
  isPremium,
  currentTime = 0,
  onSeek,
  onUpgradeClick,
}: TranscriptViewerProps) {
  const { user } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Parse transcript into segments
  const segments = parseTranscript(transcript);
  
  // State
  const [autoScroll, setAutoScroll] = useState(true);
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [savedPhrases, setSavedPhrases] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTextForModal, setSelectedTextForModal] = useState('');
  const [selectedSentence, setSelectedSentence] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  
  // Current highlighted segment
  const currentSegmentIndex = getCurrentSegmentIndex(segments, currentTime);

  // Text selection hook
  const { selection, clearSelection } = useTextSelection(containerRef, {
    maxLength: 100,
    onSelectionTooLong: (length) => {
      toast.warning(`Selection too long (${length}/100 characters). Please select a shorter phrase.`);
    },
  });

  // Load saved phrases
  const loadSavedPhrases = useCallback(async () => {
    if (!user?.id || !isPremium) return;
    
    try {
      const phrases = await getSavedPhrasesForVideo(user.id, videoId);
      setSavedPhrases(phrases);
    } catch (error) {
      console.error('Error loading saved phrases:', error);
    }
  }, [user?.id, videoId, isPremium]);

  useEffect(() => {
    loadSavedPhrases();
  }, [loadSavedPhrases]);

  // Auto-scroll to current segment
  useEffect(() => {
    if (autoScroll && currentSegmentIndex >= 0 && lineRefs.current[currentSegmentIndex]) {
      lineRefs.current[currentSegmentIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSegmentIndex, autoScroll]);

  const handleTimestampClick = (timeSeconds: number) => {
    onSeek?.(timeSeconds);
  };

  const handleCreateFlashcard = () => {
    if (!selection) return;
    
    // Find the segment containing this selection
    const segmentIndex = segments.findIndex(s => 
      s.text.toLowerCase().includes(selection.text.toLowerCase())
    );
    const segment = segments[segmentIndex] || segments[currentSegmentIndex] || segments[0];
    
    setSelectedTextForModal(selection.text);
    setSelectedSentence(selection.fullSentence || segment?.text || selection.text);
    setSelectedTimestamp(segment?.timestamp || '0:00');
    setIsModalOpen(true);
    clearSelection();
  };

  const handleDismiss = () => {
    clearSelection();
  };

  const handleFlashcardSuccess = () => {
    loadSavedPhrases();
  };

  const cycleTextSize = () => {
    const sizes: TextSize[] = ['small', 'medium', 'large'];
    const currentIndex = sizes.indexOf(textSize);
    setTextSize(sizes[(currentIndex + 1) % sizes.length]);
  };

  // Show locked state for non-premium users
  if (!isPremium) {
    const previewText = segments.slice(0, 2).map(s => `(${s.timestamp}) ${s.text}`).join('\n');
    return <LockedTranscript previewText={previewText} onUpgradeClick={onUpgradeClick} />;
  }

  // Show message if no transcript available
  if (segments.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-8 text-center text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>Transcript not available for this video</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="mt-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Transcript
            </span>
            
            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Auto-scroll toggle */}
              <div className="flex items-center gap-2">
                <label htmlFor="auto-scroll" className="text-xs text-muted-foreground">
                  Auto-scroll
                </label>
                <Switch
                  id="auto-scroll"
                  checked={autoScroll}
                  onCheckedChange={setAutoScroll}
                  className="scale-75"
                />
              </div>
              
              {/* Text size */}
              <Button
                variant="ghost"
                size="sm"
                onClick={cycleTextSize}
                className="h-7 px-2 text-xs"
              >
                Aa
                {textSize === 'small' && <Minus className="w-3 h-3 ml-1" />}
                {textSize === 'large' && <Plus className="w-3 h-3 ml-1" />}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Hint */}
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
            <ScrollText className="w-3 h-3" />
            Select any text to create a flashcard
          </div>
          
          {/* Transcript content */}
          <div
            ref={containerRef}
            className={cn(
              "max-h-[300px] overflow-y-auto space-y-1 pr-2 scroll-smooth",
              TEXT_SIZE_CLASSES[textSize]
            )}
          >
            {segments.map((segment, index) => (
              <div
                key={`${segment.timestamp}-${index}`}
                ref={(el) => (lineRefs.current[index] = el)}
              >
                <TranscriptLine
                  timestamp={segment.timestamp}
                  text={segment.text}
                  timeSeconds={segment.timeSeconds}
                  isHighlighted={index === currentSegmentIndex}
                  savedPhrases={savedPhrases}
                  onTimestampClick={handleTimestampClick}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selection popover */}
      {selection && (
        <TextSelectionPopover
          selectedText={selection.text}
          position={selection.position}
          onCreateFlashcard={handleCreateFlashcard}
          onDismiss={handleDismiss}
        />
      )}

      {/* Flashcard creation modal */}
      <FlashcardCreatorModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        selectedText={selectedTextForModal}
        fullSentence={selectedSentence}
        timestamp={selectedTimestamp}
        videoId={videoId}
        videoTitle={videoTitle}
        language={language}
        onSuccess={handleFlashcardSuccess}
      />
    </>
  );
}

export default TranscriptViewer;
