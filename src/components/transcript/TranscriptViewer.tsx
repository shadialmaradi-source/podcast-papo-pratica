import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { FileText, Minus, Plus, Sparkles, Loader2, X } from 'lucide-react';
import { parseTranscript, getCurrentSegmentIndex, type TranscriptSegment } from '@/utils/transcriptUtils';
import { useTextSelection } from '@/hooks/useTextSelection';
import { getSavedPhrasesForVideo } from '@/services/flashcardService';
import { getTranscriptSuggestions, analyzeWord, type TranscriptWordSuggestion, type WordAnalysis } from '@/services/wordAnalysisService';
import { useAuth } from '@/hooks/useAuth';
import TranscriptLine from './TranscriptLine';
import TextSelectionPopover from './TextSelectionPopover';
import FlashcardCreatorModal from './FlashcardCreatorModal';
import WordExplorerPanel from './WordExplorerPanel';
import LockedTranscript from './LockedTranscript';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TranscriptViewerProps {
  videoId: string;
  transcript: string;
  videoTitle: string;
  language: string;
  isPremium: boolean;
  currentTime?: number;
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

  const segments = parseTranscript(transcript);

  // State
  const [autoScroll, setAutoScroll] = useState(true);
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [savedPhrases, setSavedPhrases] = useState<string[]>([]);
  const [suggestedWords, setSuggestedWords] = useState<TranscriptWordSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Onboarding / hint banner state
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('transcript_onboarding_seen')
  );
  const [hintDismissed, setHintDismissed] = useState(false);

  // Flashcard modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTextForModal, setSelectedTextForModal] = useState('');
  const [selectedSentence, setSelectedSentence] = useState('');
  const [selectedTimestamp, setSelectedTimestamp] = useState('');
  const [preloadedAnalysis, setPreloadedAnalysis] = useState<{ translation: string; partOfSpeech: string } | null>(null);

  // Word explorer state
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [explorerWord, setExplorerWord] = useState('');
  const [explorerAnalysis, setExplorerAnalysis] = useState<WordAnalysis | null>(null);
  const [explorerLoading, setExplorerLoading] = useState(false);

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

  // Load AI-suggested words
  useEffect(() => {
    if (!isPremium || segments.length === 0) return;

    setSuggestionsLoading(true);
    getTranscriptSuggestions(videoId, transcript, language)
      .then((suggestions) => {
        setSuggestedWords(suggestions);
      })
      .catch((error) => {
        console.error('Error loading suggested words:', error);
        // Silent fail — suggestions are a nice-to-have
      })
      .finally(() => {
        setSuggestionsLoading(false);
      });
  }, [videoId, transcript, language, isPremium, segments.length]);

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

  // Get suggestions for a specific segment
  const getSuggestionsForSegment = useCallback(
    (segmentIndex: number) => {
      return suggestedWords.filter((s) => s.segmentIndex === segmentIndex);
    },
    [suggestedWords]
  );

  // --- Flashcard creation ---
  const openFlashcardModal = (
    text: string,
    sentence: string,
    timestamp: string,
    preloaded?: { translation: string; partOfSpeech: string } | null
  ) => {
    setSelectedTextForModal(text);
    setSelectedSentence(sentence);
    setSelectedTimestamp(timestamp);
    setPreloadedAnalysis(preloaded || null);
    setIsModalOpen(true);
    clearSelection();
  };

  const handleCreateFlashcard = () => {
    if (!selection) return;
    const segmentIndex = segments.findIndex((s) =>
      s.text.toLowerCase().includes(selection.text.toLowerCase())
    );
    const segment = segments[segmentIndex] || segments[currentSegmentIndex] || segments[0];
    openFlashcardModal(
      selection.text,
      selection.fullSentence || segment?.text || selection.text,
      segment?.timestamp || '0:00'
    );
  };

  // --- Word Explorer ---
  const openExplorer = async (word: string, contextSentence?: string) => {
    setExplorerWord(word);
    setExplorerAnalysis(null);
    setIsExplorerOpen(true);
    setExplorerLoading(true);
    clearSelection();

    try {
      const analysis = await analyzeWord(word, language, contextSentence);
      setExplorerAnalysis(analysis);
    } catch (error) {
      console.error('Error exploring word:', error);
      toast.error('Failed to analyze word. Please try again.');
    } finally {
      setExplorerLoading(false);
    }
  };

  const handleExploreWord = () => {
    if (!selection) return;
    const segmentIndex = segments.findIndex((s) =>
      s.text.toLowerCase().includes(selection.text.toLowerCase())
    );
    const segment = segments[segmentIndex] || segments[currentSegmentIndex] || segments[0];
    openExplorer(selection.text, segment?.text);
  };

  const handleExplorerSaveFlashcard = () => {
    if (!explorerAnalysis) return;
    setIsExplorerOpen(false);
    openFlashcardModal(explorerWord, explorerAnalysis.exampleSentence || explorerWord, '', {
      translation: explorerAnalysis.translation,
      partOfSpeech: explorerAnalysis.partOfSpeech,
    });
  };

  // Auto-dismiss onboarding after 8 seconds
  useEffect(() => {
    if (showOnboarding && suggestedWords.length > 0) {
      const timer = setTimeout(() => {
        setShowOnboarding(false);
        localStorage.setItem('transcript_onboarding_seen', 'true');
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [showOnboarding, suggestedWords.length]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem('transcript_onboarding_seen', 'true');
  }, []);

  // --- Suggested word click ---
  const handleSuggestedWordClick = (suggestion: TranscriptWordSuggestion) => {
    dismissOnboarding();
    const segment = segments[suggestion.segmentIndex] || segments[0];
    openFlashcardModal(suggestion.phrase, segment?.text || suggestion.phrase, segment?.timestamp || '0:00', {
      translation: suggestion.translation,
      partOfSpeech: suggestion.partOfSpeech,
    });
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
    const previewText = segments.slice(0, 2).map((s) => `(${s.timestamp}) ${s.text}`).join('\n');
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
              {suggestionsLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
              )}
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
          {/* Onboarding tooltip for first-time users */}
          <AnimatePresence>
            {showOnboarding && suggestedWords.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3 flex items-start gap-2"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                >
                  <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                </motion.div>
                <p className="text-sm text-foreground flex-1">
                  <strong>Tip:</strong> Tap any{' '}
                  <span className="border-b-2 border-dashed border-primary/50">underlined word</span>{' '}
                  to save it as a flashcard, or select text to explore vocabulary!
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 shrink-0"
                  onClick={dismissOnboarding}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Persistent hint banner (shown after onboarding dismissed) */}
          {!showOnboarding && !hintDismissed && (
            <div className="bg-muted/50 border border-border rounded-lg p-2.5 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <p className="text-xs sm:text-sm text-muted-foreground flex-1">
                Tap <span className="border-b border-dashed border-accent-foreground/30">underlined words</span> to save flashcards — or select any text to explore
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 shrink-0"
                onClick={() => setHintDismissed(true)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Transcript content */}
          <div
            ref={containerRef}
            className={cn(
              'max-h-[300px] overflow-y-auto space-y-1 pr-2 scroll-smooth',
              TEXT_SIZE_CLASSES[textSize]
            )}
          >
            {segments.map((segment, index) => (
              <div key={`${segment.timestamp}-${index}`} ref={(el) => (lineRefs.current[index] = el)}>
                <TranscriptLine
                  timestamp={segment.timestamp}
                  text={segment.text}
                  timeSeconds={segment.timeSeconds}
                  isHighlighted={index === currentSegmentIndex}
                  savedPhrases={savedPhrases}
                  suggestedWords={getSuggestionsForSegment(index)}
                  onTimestampClick={handleTimestampClick}
                  onSuggestedWordClick={handleSuggestedWordClick}
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
          onExploreWord={handleExploreWord}
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
        preloadedAnalysis={preloadedAnalysis}
      />

      {/* Word explorer panel */}
      <WordExplorerPanel
        open={isExplorerOpen}
        onOpenChange={setIsExplorerOpen}
        word={explorerWord}
        language={language}
        analysis={explorerAnalysis}
        loading={explorerLoading}
        onSaveFlashcard={handleExplorerSaveFlashcard}
      />
    </>
  );
}

export default TranscriptViewer;
