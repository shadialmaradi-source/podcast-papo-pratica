import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import { toast } from "sonner";

interface VideoFlashcardsProps {
  videoId: string;
  level: string;
  onComplete: () => void;
  onBack: () => void;
}

interface Flashcard {
  phrase: string;
  translation: string;
  why: string;
}

export function VideoFlashcards({ videoId, level, onComplete, onBack }: VideoFlashcardsProps) {
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFlashcards = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, get the transcript for this video
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('youtube_transcripts')
          .select('transcript, language')
          .eq('video_id', videoId)
          .maybeSingle();

        if (transcriptError) {
          console.error('Error fetching transcript:', transcriptError);
          throw new Error('Failed to load video transcript');
        }

        if (!transcriptData?.transcript) {
          throw new Error('No transcript available for this video');
        }

        // Get the session for auth
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Please log in to view flashcards');
        }

        // Call the edge function to generate/fetch flashcards
        const { data, error: fnError } = await supabase.functions.invoke('generate-flashcards', {
          body: {
            videoId,
            transcript: transcriptData.transcript,
            language: transcriptData.language || 'portuguese',
            level: level || 'beginner',
          },
        });

        if (fnError) {
          console.error('Edge function error:', fnError);
          throw new Error('Failed to generate flashcards');
        }

        if (data?.flashcards && data.flashcards.length > 0) {
          setFlashcards(data.flashcards);
          if (data.cached) {
            console.log('Loaded cached flashcards');
          } else {
            console.log('Generated new flashcards');
          }
        } else {
          throw new Error('No flashcards generated');
        }
      } catch (err) {
        console.error('Error loading flashcards:', err);
        setError(err instanceof Error ? err.message : 'Failed to load flashcards');
        toast.error('Failed to load flashcards');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlashcards();
  }, [videoId, level]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <h2 className="text-xl font-semibold text-foreground">Generating Flashcards...</h2>
          <p className="text-muted-foreground">
            Creating personalized vocabulary cards from the video
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">😕</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Couldn't Load Flashcards</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-3 justify-center pt-4">
            <Button variant="outline" onClick={onBack} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            <Button onClick={onComplete}>
              Skip to Complete
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">📚</span>
          </div>
          <h2 className="text-xl font-semibold text-foreground">No Flashcards Available</h2>
          <p className="text-muted-foreground">
            We couldn't generate flashcards for this video. You can still complete the lesson!
          </p>
          <Button onClick={onComplete} className="mt-4">
            Complete Lesson
          </Button>
        </div>
      </div>
    );
  }

  return <LessonFlashcards flashcards={flashcards} onComplete={onComplete} />;
}

export default VideoFlashcards;
