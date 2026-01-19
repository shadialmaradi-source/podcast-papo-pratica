import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, BookOpen, Filter, Loader2, Shuffle } from "lucide-react";
import { motion } from "framer-motion";
import LessonFlashcards from "@/components/lesson/LessonFlashcards";
import { toast } from "sonner";

interface FlashcardRepositoryProps {
  userId: string;
  onClose: () => void;
}

interface UserFlashcard {
  id: string;
  flashcard_id: string;
  video_id: string;
  first_viewed_at: string;
  last_reviewed_at: string;
  times_reviewed: number;
  is_mastered: boolean;
  phrase: string;
  translation: string;
  why: string;
  video_title: string;
  video_thumbnail: string | null;
}

interface VideoGroup {
  video_id: string;
  video_title: string;
  video_thumbnail: string | null;
  flashcard_count: number;
}

export function FlashcardRepository({ userId, onClose }: FlashcardRepositoryProps) {
  const [flashcards, setFlashcards] = useState<UserFlashcard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStudying, setIsStudying] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [videoGroups, setVideoGroups] = useState<VideoGroup[]>([]);
  const [studyFlashcards, setStudyFlashcards] = useState<{ phrase: string; translation: string; why: string }[]>([]);

  useEffect(() => {
    loadFlashcards();
  }, [userId]);

  const loadFlashcards = async () => {
    try {
      setLoading(true);

      // Fetch user's viewed flashcards with flashcard and video details
      const { data, error } = await supabase
        .from('user_viewed_flashcards')
        .select(`
          id,
          flashcard_id,
          video_id,
          first_viewed_at,
          last_reviewed_at,
          times_reviewed,
          is_mastered,
          youtube_flashcards!inner(phrase, translation, why),
          youtube_videos!inner(title, thumbnail_url)
        `)
        .eq('user_id', userId)
        .order('last_reviewed_at', { ascending: false });

      if (error) {
        console.error('Error loading flashcards:', error);
        toast.error('Failed to load flashcards');
        return;
      }

      if (data) {
        const formattedFlashcards: UserFlashcard[] = data.map((item: any) => ({
          id: item.id,
          flashcard_id: item.flashcard_id,
          video_id: item.video_id,
          first_viewed_at: item.first_viewed_at,
          last_reviewed_at: item.last_reviewed_at,
          times_reviewed: item.times_reviewed,
          is_mastered: item.is_mastered,
          phrase: item.youtube_flashcards.phrase,
          translation: item.youtube_flashcards.translation,
          why: item.youtube_flashcards.why,
          video_title: item.youtube_videos.title,
          video_thumbnail: item.youtube_videos.thumbnail_url,
        }));

        setFlashcards(formattedFlashcards);

        // Group by video
        const groups: Record<string, VideoGroup> = {};
        formattedFlashcards.forEach(fc => {
          if (!groups[fc.video_id]) {
            groups[fc.video_id] = {
              video_id: fc.video_id,
              video_title: fc.video_title,
              video_thumbnail: fc.video_thumbnail,
              flashcard_count: 0,
            };
          }
          groups[fc.video_id].flashcard_count++;
        });
        setVideoGroups(Object.values(groups));
      }
    } catch (err) {
      console.error('Error loading flashcards:', err);
      toast.error('Failed to load flashcards');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredFlashcards = () => {
    let filtered = flashcards;

    if (filter === "unmastered") {
      filtered = flashcards.filter(fc => !fc.is_mastered);
    } else if (filter !== "all") {
      // Filter by video_id
      filtered = flashcards.filter(fc => fc.video_id === filter);
    }

    return filtered;
  };

  const startStudySession = (shuffle = false) => {
    const filtered = getFilteredFlashcards();
    
    if (filtered.length === 0) {
      toast.error('No flashcards to study');
      return;
    }

    let cardsToStudy = filtered.map(fc => ({
      phrase: fc.phrase,
      translation: fc.translation,
      why: fc.why,
    }));

    if (shuffle) {
      cardsToStudy = cardsToStudy.sort(() => Math.random() - 0.5);
    }

    setStudyFlashcards(cardsToStudy);
    setIsStudying(true);
  };

  const handleStudyComplete = async () => {
    // Update last_reviewed_at and times_reviewed for all studied cards
    const filtered = getFilteredFlashcards();
    const flashcardIds = filtered.map(fc => fc.id);

    try {
      // Update each record - increment times_reviewed
      for (const id of flashcardIds) {
        await supabase
          .from('user_viewed_flashcards')
          .update({
            last_reviewed_at: new Date().toISOString(),
            times_reviewed: filtered.find(fc => fc.id === id)!.times_reviewed + 1,
          })
          .eq('id', id);
      }

      toast.success('Study session complete! 🎉');
    } catch (error) {
      console.error('Error updating flashcard progress:', error);
    }

    setIsStudying(false);
    loadFlashcards(); // Refresh data
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  if (isStudying && studyFlashcards.length > 0) {
    return <LessonFlashcards flashcards={studyFlashcards} onComplete={handleStudyComplete} />;
  }

  const filteredCount = getFilteredFlashcards().length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile
          </Button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            <BookOpen className="w-8 h-8 inline-block mr-2 text-primary" />
            My Flashcards
          </h1>
          <p className="text-muted-foreground">
            Review vocabulary from all your completed lessons
          </p>
        </div>

        {/* Stats Card */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-primary/10 to-secondary/10">
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-primary">{flashcards.length}</div>
                <div className="text-sm text-muted-foreground">Total Flashcards</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-green-500">
                  {flashcards.filter(fc => fc.is_mastered).length}
                </div>
                <div className="text-sm text-muted-foreground">Mastered</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-500">{videoGroups.length}</div>
                <div className="text-sm text-muted-foreground">Videos</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {flashcards.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Flashcards Yet</h3>
              <p className="text-muted-foreground mb-4">
                Complete video lessons to start building your flashcard collection!
              </p>
              <Button onClick={onClose}>Browse Videos</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Filter & Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Study Options
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select value={filter} onValueChange={setFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter flashcards" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Flashcards ({flashcards.length})</SelectItem>
                        <SelectItem value="unmastered">
                          Unmastered ({flashcards.filter(fc => !fc.is_mastered).length})
                        </SelectItem>
                        {videoGroups.map(group => (
                          <SelectItem key={group.video_id} value={group.video_id}>
                            {group.video_title.substring(0, 40)}... ({group.flashcard_count})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={() => startStudySession(false)} 
                    className="flex-1 gap-2"
                    disabled={filteredCount === 0}
                  >
                    <BookOpen className="w-4 h-4" />
                    Start Study Session ({filteredCount} cards)
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => startStudySession(true)}
                    className="gap-2"
                    disabled={filteredCount === 0}
                  >
                    <Shuffle className="w-4 h-4" />
                    Shuffle & Study
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Video Groups */}
            <Card>
              <CardHeader>
                <CardTitle>Flashcards by Video</CardTitle>
                <CardDescription>Select a video to study specific vocabulary</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {videoGroups.map(group => (
                    <motion.div
                      key={group.video_id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilter(group.video_id);
                        startStudySession(false);
                      }}
                    >
                      <Card className="hover:border-primary/40 transition-colors">
                        <CardContent className="p-4 flex items-center gap-4">
                          {group.video_thumbnail && (
                            <img
                              src={group.video_thumbnail}
                              alt={group.video_title}
                              className="w-20 h-12 object-cover rounded"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{group.video_title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {group.flashcard_count} flashcards
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default FlashcardRepository;
