import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, BookOpen, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import { toast } from "sonner";

const BATCH_SIZE = 10;

interface ReviewCard {
  phrase: string;
  translation: string;
  why: string;
  cardLanguage?: string;
}

interface QuickReviewSessionProps {
  userId: string;
  language: string;
  onClose: () => void;
}

type Phase = "loading" | "studying" | "continue_prompt" | "all_done";

export function QuickReviewSession({ userId, language, onClose }: QuickReviewSessionProps) {
  const navigate = useNavigate();
  const [allCards, setAllCards] = useState<ReviewCard[]>([]);
  const [batchIndex, setBatchIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const [findingVideo, setFindingVideo] = useState(false);

  useEffect(() => {
    loadCards();
  }, [userId, language]);

  const loadCards = async () => {
    try {
      const { data, error } = await supabase
        .from("user_viewed_flashcards")
        .select(`
          id,
          youtube_flashcards!inner(phrase, translation, why),
          youtube_videos!inner(language)
        `)
        .eq("user_id", userId)
        .order("last_reviewed_at", { ascending: true });

      if (error) throw error;

      const cards: ReviewCard[] = (data || [])
        .filter((item: any) => (item.youtube_videos?.language || "english") === language)
        .map((item: any) => ({
          phrase: item.youtube_flashcards.phrase,
          translation: item.youtube_flashcards.translation,
          why: item.youtube_flashcards.why,
          cardLanguage: item.youtube_videos?.language || language,
        }))
        // Shuffle
        .sort(() => Math.random() - 0.5);

      setAllCards(cards);

      if (cards.length === 0) {
        setPhase("all_done");
      } else {
        setBatchIndex(0);
        setPhase("studying");
      }
    } catch (err) {
      console.error("Error loading flashcards for review:", err);
      toast.error("Failed to load flashcards");
      onClose();
    }
  };

  const currentBatch = allCards.slice(
    batchIndex * BATCH_SIZE,
    (batchIndex + 1) * BATCH_SIZE
  );

  const hasMore = (batchIndex + 1) * BATCH_SIZE < allCards.length;
  const reviewedCount = Math.min((batchIndex + 1) * BATCH_SIZE, allCards.length);

  const handleBatchComplete = () => {
    if (hasMore) {
      setPhase("continue_prompt");
    } else {
      setPhase("all_done");
    }
  };

  const handleContinue = () => {
    setBatchIndex((prev) => prev + 1);
    setPhase("studying");
  };

  const handleFindVideo = useCallback(async () => {
    setFindingVideo(true);
    try {
      // Find a video matching user's language that they haven't seen recently
      const { data: videos } = await supabase
        .from("youtube_videos")
        .select("id, category, is_short, difficulty_level")
        .eq("language", language)
        .eq("status", "ready")
        .eq("is_curated", false)
        .limit(20);

      if (videos && videos.length > 0) {
        // Pick a random one
        const pick = videos[Math.floor(Math.random() * videos.length)];
        navigate(`/lesson/${pick.id}`);
      } else {
        // Fallback to library
        toast.info("No matching videos found. Opening the library...");
        navigate("/library");
      }
    } catch {
      navigate("/library");
    } finally {
      setFindingVideo(false);
    }
  }, [language, navigate]);

  // Loading
  if (phase === "loading") {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading flashcards...</p>
        </div>
      </div>
    );
  }

  // Studying batch
  if (phase === "studying" && currentBatch.length > 0) {
    return (
      <LessonFlashcards
        flashcards={currentBatch}
        onComplete={handleBatchComplete}
        onExit={onClose}
        language={language}
      />
    );
  }

  // Continue prompt
  if (phase === "continue_prompt") {
    const remaining = allCards.length - reviewedCount;
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full space-y-6 text-center"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Nice! {reviewedCount} cards reviewed 🎉
            </h2>
            <p className="text-muted-foreground text-sm mt-2">
              You have {remaining} more flashcard{remaining !== 1 ? "s" : ""} left. Want to continue?
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button onClick={handleContinue} className="gap-2">
              Continue
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={onClose}>
              Done for now
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // All done / no cards
  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full space-y-6 text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">
            {allCards.length === 0
              ? "No flashcards yet"
              : "All flashcards reviewed! 🏆"}
          </h2>
          <p className="text-muted-foreground text-sm mt-2">
            {allCards.length === 0
              ? "Watch videos and save flashcards to build your collection."
              : "Great job! Watch more videos to discover new vocabulary."}
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Button
            onClick={handleFindVideo}
            disabled={findingVideo}
            className="gap-2"
          >
            {findingVideo ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Video className="w-4 h-4" />
            )}
            Find a Video
          </Button>
          <Button variant="outline" onClick={onClose}>
            Back to Home
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
