import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Play,
  FileText, 
  Clock,
  BookOpen,
  Users,
  Eye
} from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { LevelIntensitySelector } from "./LevelIntensitySelector";

const mapDifficultyLevel = (level: string): string => {
  switch (level?.toUpperCase()) {
    case 'A1':
    case 'A2':
      return 'Beginner';
    case 'B1':
    case 'B2':
      return 'Intermediate';
    case 'C1':
    case 'C2':
      return 'Advanced';
    case 'BEGINNER':
      return 'Beginner';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    default:
      return level || 'Unknown';
  }
};

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  description?: string;
  thumbnail_url?: string;
  duration?: number;
  difficulty_level: string;
  category?: string;
  view_count?: number;
  rating?: number;
  total_ratings?: number;
}

interface YouTubeVideoPlayerProps {
  videoId: string;
  onStartExercises: (level: string) => void;
  onBack: () => void;
}

const formatDuration = (seconds: number | null | undefined): string => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

// Mock transcript for demo
const getMockTranscript = (videoTitle: string) => {
  return `Welcome to "${videoTitle}". In this video, we're going to explore some fascinating topics that will help you improve your language skills.

The lesson begins with a discussion about key concepts that are essential for language learners. We'll cover important vocabulary, grammar structures, and practical applications.

Throughout this video, you'll encounter new words and phrases that are commonly used in everyday situations. Pay attention to the pronunciation and try to identify the patterns that are repeated.

We'll also discuss practical tips for incorporating what you learn into your daily routine. The presenter will share effective strategies for practicing and remembering new language skills.

As we progress through the content, notice how different concepts are connected and how they build upon each other. This is an excellent opportunity to expand your understanding and improve your language abilities.

Remember to take notes as you watch, and don't worry if you don't understand everything the first time. Language learning is a gradual process, and each viewing session helps build your skills.

At the end of this video, you'll have the opportunity to test your understanding through various exercises designed for your current level. These activities will help reinforce what you've learned and identify areas for improvement.

Thank you for joining us today, and we hope you find this video both educational and enjoyable. Let's begin our language learning journey together!`;
};

export function YouTubeVideoPlayer({ videoId, onStartExercises, onBack }: YouTubeVideoPlayerProps) {
  const [video, setVideo] = useState<YouTubeVideo | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showTranscript, setShowTranscript] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [showLevelSelector, setShowLevelSelector] = useState(false);

  const levels = [
    { code: "beginner", name: "Beginner", color: "bg-green-500" },
    { code: "intermediate", name: "Intermediate", color: "bg-warning" },
    { code: "advanced", name: "Advanced", color: "bg-destructive" },
  ];

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  const fetchVideoData = async () => {
    try {
      setIsLoading(true);
      
      // Try to fetch from database first
      const { data: videoData, error: videoError } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (videoData && !videoError) {
        setVideo(videoData);
        
        // Fetch transcript if available
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('youtube_transcripts')
          .select('transcript')
          .eq('video_id', videoData.id)
          .single();
          
        if (transcriptData && !transcriptError) {
          setTranscript(transcriptData.transcript);
        }
      } else {
        // Fallback to mock data if not found in database
        const mockVideo: YouTubeVideo = {
          id: `mock-${videoId}`,
          video_id: videoId,
          title: 'YouTube Video',
          description: 'An educational video to help you learn and practice your language skills.',
          difficulty_level: 'beginner',
          view_count: 1000,
          rating: 4.5,
          total_ratings: 50,
          duration: 600
        };
        setVideo(mockVideo);
      }
    } catch (error) {
      console.error('Error fetching video data:', error);
      // Create mock video on error
      const mockVideo: YouTubeVideo = {
        id: `mock-${videoId}`,
        video_id: videoId,
        title: 'YouTube Video',
        description: 'An educational video to help you learn and practice your language skills.',
        difficulty_level: 'beginner',
        view_count: 1000,
        rating: 4.5,
        total_ratings: 50,
        duration: 600
      };
      setVideo(mockVideo);
      
      toast({
        title: "Using Demo Data",
        description: "Video details loaded from demo data.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    onStartExercises(level);
    setShowLevelSelector(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Video not found</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <Button variant="outline" size="sm" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex-1 w-full">
          <h2 className="text-xl sm:text-2xl font-bold break-words">{video.title}</h2>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">
              {mapDifficultyLevel(video.difficulty_level)}
            </Badge>
            {video.category && (
              <Badge variant="secondary">
                {video.category}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* YouTube Video Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Watch Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg"
                src={`https://www.youtube.com/embed/${videoId}`}
                title={video.title}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Exercise Levels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Practice Exercises
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your language level to start practicing with this video
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {levels.map((level) => (
              <motion.div
                key={level.code}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto p-4 sm:p-6 flex flex-col gap-2 sm:gap-3 hover:shadow-md transition-all"
                  onClick={() => {
                    setSelectedLevel(level.code);
                    setShowLevelSelector(true);
                  }}
                >
                  <Badge className={`${level.color} text-white text-base sm:text-lg px-2 sm:px-3 py-1`}>
                    {level.code}
                  </Badge>
                  <div className="text-center">
                    <div className="font-medium text-xs sm:text-sm">
                      {level.name.split(' ')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground hidden sm:block">
                      {level.name.split(' ').slice(1).join(' ')}
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {showTranscript ? "Hide" : "Show"} Transcript
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] w-[95vw] sm:w-full">
                <DialogHeader>
                  <DialogTitle className="text-base sm:text-lg">Video Transcript</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-2 sm:pr-4">
                  <div className="space-y-4 text-sm leading-relaxed">
                    {transcript ? 
                      transcript.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-muted-foreground">
                          {paragraph.trim()}
                        </p>
                      )) :
                      getMockTranscript(video.title).split('\n').map((paragraph, index) => (
                        <p key={index} className="text-muted-foreground">
                          {paragraph.trim()}
                        </p>
                      ))
                    }
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Video Details */}
      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">
            {video.description || "No description available for this video."}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {video.duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatDuration(video.duration)}
              </div>
            )}
            {video.view_count && (
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {video.view_count.toLocaleString()} views
              </div>
            )}
            {video.rating && (
              <div className="flex items-center gap-1">
                <span>⭐</span>
                {video.rating.toFixed(1)} ({video.total_ratings} ratings)
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Level Selector */}
      <LevelIntensitySelector
        isOpen={showLevelSelector}
        onClose={() => setShowLevelSelector(false)}
        onSelect={handleLevelSelect}
        title="Scegli il Livello"
      />
    </div>
  );
}