import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Play, Clock, Calendar, BookOpen, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { getPodcastEpisodes, getUserEpisodeProgress, PodcastEpisode, PodcastSource } from "@/services/podcastService";
import { formatDistanceToNow } from "date-fns";
import { EpisodePlayer } from "./EpisodePlayer";

interface EpisodeSelectorProps {
  podcast: PodcastSource;
  onSelectEpisode: (episode: PodcastEpisode) => void;
  onStartExercises: (episode: PodcastEpisode, level: string, intensity: string) => void;
  onBack: () => void;
}

export function EpisodeSelector({ podcast, onSelectEpisode, onStartExercises, onBack }: EpisodeSelectorProps) {
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<PodcastEpisode | null>(null);

  useEffect(() => {
    loadEpisodes();
  }, [podcast.id]);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      const data = await getPodcastEpisodes(podcast.id, 20);
      setEpisodes(data);

      // Load progress for each episode
      const progressPromises = data.map(async (episode) => {
        const progress = await getUserEpisodeProgress(episode.id);
        return { episodeId: episode.id, progress };
      });

      const progressResults = await Promise.all(progressPromises);
      const progressMap = progressResults.reduce((acc, { episodeId, progress }) => {
        acc[episodeId] = progress;
        return acc;
      }, {} as Record<string, any>);

      setEpisodeProgress(progressMap);
    } catch (error) {
      console.error('Error loading episodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleEpisodeSelect = (episode: PodcastEpisode) => {
    setSelectedEpisode(episode);
    onSelectEpisode(episode);
  };

  const handleStartExercises = (level: string, intensity: string) => {
    if (selectedEpisode) {
      onStartExercises(selectedEpisode, level, intensity);
    }
  };

  const handleBackToList = () => {
    setSelectedEpisode(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show episode player if an episode is selected
  if (selectedEpisode) {
    return (
      <EpisodePlayer
        episode={selectedEpisode}
        onStartExercises={handleStartExercises}
        onBack={handleBackToList}
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={onBack} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="space-y-3">
          <h2 className="text-xl sm:text-2xl font-bold">{podcast.title}</h2>
          <p className="text-sm sm:text-base text-muted-foreground">{podcast.description}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Level {podcast.difficulty_level}</Badge>
            <Badge variant="secondary">{podcast.category}</Badge>
            <Badge className="bg-green-500 text-white">#{podcast.spotify_chart_rank}</Badge>
          </div>
        </div>
      </div>

      {/* Episodes List */}
      <div className="space-y-3 sm:space-y-4">
        <h3 className="text-lg sm:text-xl font-semibold">Episodes</h3>
        
        {episodes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                No episodes available yet. Episodes will be added soon!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:gap-4">
            {episodes.map((episode, index) => {
              const progress = episodeProgress[episode.id];
              const isCompleted = progress?.is_completed || false;
              const progressPercentage = progress?.progress_percentage || 0;

              return (
                <motion.div
                  key={episode.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className="hover:shadow-lg transition-all duration-300 cursor-pointer group"
                    onClick={() => handleEpisodeSelect(episode)}
                  >
                    <CardHeader className="pb-3">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {episode.episode_number && (
                            <Badge variant="outline" className="text-xs">
                              EP {episode.episode_number}
                            </Badge>
                          )}
                          {isCompleted && (
                            <Badge className="bg-green-500 text-white text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        
                        <CardTitle className="text-base sm:text-lg group-hover:text-primary transition-colors line-clamp-2">
                          {episode.title}
                        </CardTitle>
                        
                        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {episode.duration ? formatDuration(episode.duration) : 'Unknown'}
                          </div>
                          {episode.publish_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span className="hidden sm:inline">{formatDistanceToNow(new Date(episode.publish_date), { addSuffix: true })}</span>
                              <span className="sm:hidden">{new Date(episode.publish_date).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <Button size="sm" variant="outline" className="gap-2 w-full sm:w-auto">
                          <Play className="h-3 w-3" />
                          Start
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {episode.description || "No description available"}
                      </p>
                      
                      {progress && progressPercentage > 0 && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>{progressPercentage}%</span>
                          </div>
                          <Progress value={progressPercentage} className="h-2" />
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <BookOpen className="h-3 w-3" />
                          <span>Exercises available</span>
                        </div>
                        {episode.transcript && (
                          <Badge variant="secondary" className="text-xs">
                            Transcript
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}