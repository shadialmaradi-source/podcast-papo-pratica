import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Sparkles, Clock, Video } from 'lucide-react';
import { createFlashcardFromTranscript } from '@/services/flashcardService';
import { analyzeWord, type WordAnalysis } from '@/services/wordAnalysisService';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface FlashcardCreatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedText: string;
  fullSentence: string;
  timestamp?: string;
  videoId?: string;
  videoTitle?: string;
  language: string;
  onSuccess: () => void;
  /** Pre-loaded AI data (from suggested words) to skip the API call */
  preloadedAnalysis?: {
    translation: string;
    partOfSpeech: string;
  } | null;
}

const PARTS_OF_SPEECH = [
  { value: 'noun', label: 'Noun' },
  { value: 'verb', label: 'Verb' },
  { value: 'adjective', label: 'Adjective' },
  { value: 'adverb', label: 'Adverb' },
  { value: 'phrase', label: 'Phrase' },
  { value: 'expression', label: 'Expression' },
  { value: 'preposition', label: 'Preposition' },
  { value: 'conjunction', label: 'Conjunction' },
  { value: 'pronoun', label: 'Pronoun' },
  { value: 'other', label: 'Other' },
];

export function FlashcardCreatorModal({
  open,
  onOpenChange,
  selectedText,
  fullSentence,
  timestamp = '',
  videoId = '',
  videoTitle = '',
  language,
  onSuccess,
  preloadedAnalysis,
}: FlashcardCreatorModalProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  // Form state
  const [phrase, setPhrase] = useState(selectedText);
  const [translation, setTranslation] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState<string>('');
  const [exampleSentence, setExampleSentence] = useState(fullSentence);
  const [notes, setNotes] = useState('');

  // Run AI auto-fill when modal opens
  useEffect(() => {
    if (!open) return;

    setPhrase(selectedText);
    setNotes('');

    // If we have preloaded data (from suggested words), use it directly
    if (preloadedAnalysis) {
      setTranslation(preloadedAnalysis.translation);
      setPartOfSpeech(preloadedAnalysis.partOfSpeech);
      setExampleSentence(fullSentence);
      return;
    }

    // Otherwise call AI to auto-fill
    setTranslation('');
    setPartOfSpeech('');
    setExampleSentence(fullSentence);

    if (selectedText.trim()) {
      setAnalyzing(true);
      analyzeWord(selectedText, language, fullSentence)
        .then((analysis) => {
          setTranslation(analysis.translation);
          setPartOfSpeech(analysis.partOfSpeech);
          if (analysis.exampleSentence) {
            setExampleSentence(analysis.exampleSentence);
          }
        })
        .catch((err) => {
          console.error('AI auto-fill failed:', err);
          // Silently fail - user can still fill manually
        })
        .finally(() => {
          setAnalyzing(false);
        });
    }
  }, [open, selectedText, fullSentence, language, preloadedAnalysis]);

  const handleSave = async () => {
    if (!user?.id) {
      toast.error('Please sign in to create flashcards');
      return;
    }

    if (!phrase.trim()) {
      toast.error('Please enter a word or phrase');
      return;
    }

    setSaving(true);

    try {
      const result = await createFlashcardFromTranscript(user.id, videoId || 'paragraph', {
        phrase: phrase.trim(),
        translation: translation.trim() || undefined,
        partOfSpeech: partOfSpeech || undefined,
        exampleSentence: exampleSentence.trim() || undefined,
        notes: notes.trim() || undefined,
        sourceTimestamp: timestamp || undefined,
      });

      if (result.success) {
        toast.success('Flashcard saved! ✨');
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || 'Failed to save flashcard');
      }
    } catch (error) {
      console.error('Error saving flashcard:', error);
      toast.error('Failed to save flashcard. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Create New Flashcard
          </DialogTitle>
          <DialogDescription>
            {analyzing
              ? 'AI is analyzing this word...'
              : 'Flashcard auto-filled by AI. Edit anything or just save.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Word/Phrase */}
          <div className="space-y-2">
            <Label htmlFor="phrase">Word/Phrase</Label>
            <Input
              id="phrase"
              value={phrase}
              onChange={(e) => setPhrase(e.target.value)}
              placeholder="Enter the word or phrase"
              className="font-medium"
            />
          </div>

          {/* Translation */}
          <div className="space-y-2">
            <Label htmlFor="translation">Translation (English)</Label>
            {analyzing ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Input
                id="translation"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="English translation"
              />
            )}
          </div>

          {/* Part of Speech */}
          <div className="space-y-2">
            <Label>Part of Speech</Label>
            {analyzing ? (
              <Skeleton className="h-10 w-full rounded-md" />
            ) : (
              <Select value={partOfSpeech} onValueChange={setPartOfSpeech}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {PARTS_OF_SPEECH.map((pos) => (
                    <SelectItem key={pos.value} value={pos.value}>
                      {pos.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Example Sentence */}
          <div className="space-y-2">
            <Label htmlFor="example">Example Sentence</Label>
            {analyzing ? (
              <Skeleton className="h-16 w-full rounded-md" />
            ) : (
              <Textarea
                id="example"
                value={exampleSentence}
                onChange={(e) => setExampleSentence(e.target.value)}
                placeholder="Example sentence for context"
                rows={2}
              />
            )}
          </div>

          {/* Notes (always editable, never auto-filled) */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any personal notes..."
              rows={2}
            />
          </div>

          {/* Source info — only show when there's a video context */}
          {videoTitle && (
            <div className="flex flex-col gap-1 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4" />
                <span className="truncate">{videoTitle}</span>
              </div>
              {timestamp && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>Timestamp: {timestamp}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || analyzing || !phrase.trim()}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Save Flashcard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FlashcardCreatorModal;
