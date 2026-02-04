import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, FileText, Sparkles, Scroll, Download, Star } from 'lucide-react';

interface LockedTranscriptProps {
  previewText: string;
  onUpgradeClick: () => void;
}

const PREMIUM_BENEFITS = [
  { icon: FileText, text: 'Full video transcripts with timestamps' },
  { icon: Sparkles, text: 'Create flashcards from any word' },
  { icon: Scroll, text: 'Auto-scroll with video playback' },
  { icon: Download, text: 'Download flashcards as PDF' },
];

export function LockedTranscript({ previewText, onUpgradeClick }: LockedTranscriptProps) {
  return (
    <Card className="mt-4 border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Transcript
          </span>
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Lock className="w-3.5 h-3.5" />
            Premium
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Preview text */}
        <div className="relative">
          <div className="font-mono text-sm text-muted-foreground leading-relaxed">
            {previewText}
          </div>
          
          {/* Blurred overlay */}
          <div className="absolute inset-0 top-8 bg-gradient-to-b from-transparent via-background/80 to-background" />
          
          {/* Fake blurred lines */}
          <div className="mt-2 space-y-2 blur-sm select-none pointer-events-none opacity-50">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-11/12" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-10/12" />
            <div className="h-4 bg-muted rounded w-full" />
          </div>
        </div>

        {/* Upgrade section */}
        <div className="text-center space-y-4 py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Star className="w-6 h-6 text-primary" />
          </div>
          
          <div>
            <h3 className="font-semibold text-lg mb-1">Unlock Interactive Transcripts</h3>
            <p className="text-sm text-muted-foreground">
              Create flashcards directly from the transcript as you watch
            </p>
          </div>

          <ul className="text-sm space-y-2 text-left max-w-xs mx-auto">
            {PREMIUM_BENEFITS.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2">
                <benefit.icon className="w-4 h-4 text-primary shrink-0" />
                <span>{benefit.text}</span>
              </li>
            ))}
          </ul>

          <Button onClick={onUpgradeClick} className="gap-2">
            <Lock className="w-4 h-4" />
            Unlock Transcript - Upgrade
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LockedTranscript;
