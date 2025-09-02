import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, Volume2 } from "lucide-react";
import { PodcastEpisode } from "@/services/podcastService";

interface PodcastPlayerProps {
  episode: PodcastEpisode;
  onBack: () => void;
}

export function PodcastPlayer({ episode, onBack }: PodcastPlayerProps) {
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Episodes
          </Button>
        </div>

        {/* Player Card */}
        <Card className="w-full shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <Badge variant="outline" className="mb-2">
                {episode.podcast_source?.difficulty_level || 'A1'} Level
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold leading-tight">
              {episode.title}
            </CardTitle>
            {episode.description && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {episode.description}
              </p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
              {episode.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(episode.duration)}
                </div>
              )}
              <div className="flex items-center gap-1">
                <Volume2 className="h-4 w-4" />
                Audio Available
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Audio Player */}
            <div className="bg-muted/50 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-center">
                🎧 Podcast Player
              </h3>
              {episode.audio_url ? (
                <audio 
                  controls 
                  autoPlay
                  className="w-full h-12"
                  preload="metadata"
                >
                  <source src={episode.audio_url} type="audio/mpeg" />
                  <source src={episode.audio_url} type="audio/wav" />
                  <source src={episode.audio_url} type="audio/ogg" />
                  Your browser does not support the audio element.
                </audio>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Volume2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Audio not available for this episode</p>
                </div>
              )}
            </div>

            {/* Episode Info */}
            <div className="grid gap-4 text-sm">
              {episode.episode_number && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Episode Number:</span>
                  <Badge variant="secondary">#{episode.episode_number}</Badge>
                </div>
              )}
              {episode.season_number && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Season:</span>
                  <Badge variant="secondary">Season {episode.season_number}</Badge>
                </div>
              )}
              {episode.podcast_source?.title && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Podcast:</span>
                  <span className="text-muted-foreground">{episode.podcast_source.title}</span>
                </div>
              )}
              {episode.transcript_language && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Language:</span>
                  <Badge variant="outline" className="capitalize">
                    {episode.transcript_language}
                  </Badge>
                </div>
              )}
            </div>

            {/* Transcript Preview */}
            {episode.transcript && (
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Transcript Preview</h4>
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {episode.transcript}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}