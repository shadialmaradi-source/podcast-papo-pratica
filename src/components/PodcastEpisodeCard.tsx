import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { 
  Play, 
  FileText, 
  Clock, 
  ExternalLink,
  Zap,
  CheckCircle,
  Circle
} from "lucide-react";
import { motion } from "framer-motion";

// Use the types from the service
import type { PodcastSource, PodcastEpisode } from "@/services/podcastService";

// Map CEFR levels to readable names
const mapDifficultyLevel = (level: string): string => {
  const lowerLevel = level.toLowerCase();
  if (lowerLevel === 'a1' || lowerLevel === 'a2') return 'Beginner';
  if (lowerLevel === 'b1' || lowerLevel === 'b2') return 'Intermediate';
  if (lowerLevel === 'c1' || lowerLevel === 'c2') return 'Advanced';
  return level; // fallback
};

// Difficulty level configurations
const DIFFICULTY_LEVELS = [
  { code: "Beginner", name: "Beginner", color: "bg-green-500" },
  { code: "Intermediate", name: "Intermediate", color: "bg-warning" },
  { code: "Advanced", name: "Advanced", color: "bg-destructive" },
];

interface PodcastEpisodeCardProps {
  podcast: PodcastSource;
  episode: PodcastEpisode;
  onStartExercises: (level: string) => void;
}

export function PodcastEpisodeCard({ podcast, episode, onStartExercises }: PodcastEpisodeCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showTranscript, setShowTranscript] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Convert CEFR levels to readable format
  const displayLevel = mapDifficultyLevel(podcast.difficulty_level);

  const getDifficultyColor = (level: string) => {
    const mappedLevel = mapDifficultyLevel(level);
    const difficulty = DIFFICULTY_LEVELS.find(d => d.code === mappedLevel);
    return difficulty?.color || "bg-gray-500";
  };

  const getDurationCategory = (duration: number | undefined): string => {
    if (!duration) return 'Unknown';
    const minutes = Math.floor(duration / 60);
    if (minutes < 10) return 'Short';
    if (minutes <= 30) return 'Medium';
    return 'Long';
  };

  const getDurationCategoryBadge = (duration: number | undefined) => {
    const category = getDurationCategory(duration);
    const categoryConfig = {
      Short: { label: 'Short', color: 'bg-green-100 text-green-700 border-green-200' },
      Medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      Long: { label: 'Long', color: 'bg-red-100 text-red-700 border-red-200' },
      Unknown: { label: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200' }
    };
    
    return categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.Unknown;
  };

  const markEpisodeComplete = async () => {
    if (!user || !episode.id) {
      toast({
        title: "Error",
        description: "Please log in to track your progress",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Insert or update episode progress
      const { error } = await supabase
        .from('user_episode_progress')
        .upsert({
          user_id: user.id,
          episode_id: episode.id,
          progress_percentage: 100,
          is_completed: true,
          completed_at: new Date().toISOString()
        });

      if (error) {
        throw error;
      }

      setIsCompleted(true);
      toast({
        title: "Episode Completed!",
        description: `You've marked "${episode.title}" as completed`,
      });
    } catch (error) {
      console.error('Error marking episode as complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark episode as completed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmbedPlayer = () => {
    // Extract Spotify episode ID from episode URL if it's a Spotify URL
    if (episode.episode_url?.includes('open.spotify.com/episode/')) {
      const episodeId = episode.episode_url.split('episode/')[1]?.split('?')[0];
      if (episodeId) {
        return (
          <div className="w-full rounded-lg overflow-hidden">
            <iframe
              data-testid="embed-iframe"
              style={{ borderRadius: '12px' }}
              src={`https://open.spotify.com/embed/episode/${episodeId}?utm_source=generator`}
              width="100%"
              height="352"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          </div>
        );
      }
    }

    // Fallback player card for non-Spotify URLs
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center gap-4">
          <img 
            src={podcast.thumbnail_url || "/placeholder.svg"} 
            alt={podcast.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold">{episode.title}</h4>
            <p className="text-sm text-muted-foreground">
              {episode.duration ? `${Math.floor(episode.duration / 60)} min` : 'Duration unknown'}
            </p>
          </div>
          <Button asChild>
            <a href={episode.episode_url} target="_blank" rel="noopener noreferrer">
              <Play className="h-4 w-4 mr-2" />
              Listen
            </a>
          </Button>
        </div>
      </Card>
    );
  };

  const generateMockTranscript = () => {
    if (podcast.language === 'italian') {
      return `La televisione italiana nasce ufficialmente il 3 gennaio 1954 con l'inizio delle trasmissioni regolari della RAI. I primi programmi erano in bianco e nero e raggiungevano solo poche città del nord Italia.

Mike Bongiorno diventa subito una figura iconica, conducendo programmi come "Lascia o raddoppia" che cambiarono per sempre il panorama televisivo italiano.

Gli anni '60 segnano l'arrivo del colore e dei primi sceneggiati televisivi, come "Il Commissario Maigret", che portarono il teatro e la narrativa nelle case degli italiani.

Carosello, trasmesso ogni sera alle 20:50, diventa un appuntamento fisso per intere famiglie, trasformando la pubblicità in intrattenimento.`;
    }

    return `This is a sample transcript excerpt for the episode "${episode.title}". The full transcript would contain the complete conversation and content from this language learning podcast episode.

This excerpt demonstrates the type of content and language level appropriate for ${displayLevel} learners.`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Episode Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className={getDifficultyColor(podcast.difficulty_level)} variant="outline">
            🎧 {displayLevel}
          </Badge>
          <Badge variant="secondary">{podcast.category || 'General'}</Badge>
          {episode.duration && (
            <Badge 
              variant="outline" 
              className={getDurationCategoryBadge(episode.duration).color}
            >
              {getDurationCategoryBadge(episode.duration).label}
            </Badge>
          )}
          {isCompleted && (
            <Badge variant="default" className="bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">{episode.title}</h1>
          <p className="text-muted-foreground mb-4">{episode.description}</p>
          
          {/* Auto-generated summary */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              📝 Summary
            </h3>
            <p className="text-sm text-muted-foreground">
              This episode of {podcast.title} covers important topics for {displayLevel} level learners, featuring authentic conversations and cultural insights.
            </p>
          </Card>
        </div>
      </div>

      {/* Podcast Embed */}
      <div className="space-y-4">
        {renderEmbedPlayer()}
        
        {/* Progress Tracking Card */}
        <Card className="p-4 border-dashed">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Track Your Progress</h4>
              <p className="text-sm text-muted-foreground">
                Mark as completed when you finish listening
              </p>
            </div>
            <Button
              onClick={markEpisodeComplete}
              disabled={isCompleted || isLoading}
              variant={isCompleted ? "outline" : "default"}
              className={isCompleted ? "bg-green-50 border-green-200" : ""}
            >
              {isLoading ? (
                "Saving..."
              ) : isCompleted ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Completed
                </>
              ) : (
                <>
                  <Circle className="h-4 w-4 mr-2" />
                  Mark Complete
                </>
              )}
            </Button>
          </div>
        </Card>
        
        {/* Metadata */}
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{episode.duration ? `${Math.floor(episode.duration / 60)} min` : 'Duration unknown'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Language:</span>
              <span className="capitalize">{podcast.language}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Level:</span>
              <span className="capitalize">{displayLevel}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4">
        {/* Transcript Dialog */}
        <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Show Transcript Excerpt
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Transcript Excerpt</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4 text-sm leading-relaxed">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Note: This is a short excerpt. Full transcript available at the original episode.
                  </p>
                </div>
                {generateMockTranscript().split('\n').map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground">
                    {paragraph.trim()}
                  </p>
                ))}
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" size="sm">
                    <a href={episode.episode_url} target="_blank" rel="noopener noreferrer">
                      View Full Episode
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Exercise Dialog */}
        <Dialog open={showExerciseDialog} onOpenChange={setShowExerciseDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Zap className="h-4 w-4" />
              Start Exercises
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Choose Exercise Level</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {DIFFICULTY_LEVELS.map((level) => (
                <Button
                  key={level.code}
                  variant="outline"
                  className="p-4 h-auto flex-col gap-2"
                  onClick={() => {
                    onStartExercises(level.code);
                    setShowExerciseDialog(false);
                  }}
                >
                  <div className={`w-8 h-8 rounded-full ${level.color} flex items-center justify-center text-white text-sm font-bold`}>
                    {level.code.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{level.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{level.code}</div>
                  </div>
                </Button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          🔗 Links & Attribution
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Full Episode:</span>
            <Button asChild variant="link" size="sm">
              <a href={episode.episode_url} target="_blank" rel="noopener noreferrer">
                {episode.title} - Listen Now
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span>RSS Feed:</span>
            <Button asChild variant="link" size="sm">
              <a href={podcast.rss_url} target="_blank" rel="noopener noreferrer">
                Podcast RSS
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          </div>
          {episode.transcript && (
            <div className="flex justify-between items-center">
              <span>Transcript Available:</span>
              <span className="text-green-600 text-xs">✓ Yes</span>
            </div>
          )}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {podcast.title} • Content used for educational purposes only
          </div>
        </div>
      </Card>
    </motion.div>
  );
}