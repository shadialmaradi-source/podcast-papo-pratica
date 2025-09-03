import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  FileText, 
  Clock, 
  ExternalLink,
  Zap 
} from "lucide-react";
import { motion } from "framer-motion";

// Use the types from the service
import type { PodcastSource, PodcastEpisode } from "@/services/podcastService";

// Difficulty level configurations
const DIFFICULTY_LEVELS = [
  { code: "A1", name: "Beginner (A1)", color: "bg-green-500" },
  { code: "A2", name: "Elementary (A2)", color: "bg-blue-500" },
  { code: "B1", name: "Intermediate (B1)", color: "bg-yellow-500" },
  { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-orange-500" },
  { code: "C1", name: "Advanced (C1)", color: "bg-red-500" },
  { code: "C2", name: "Proficiency (C2)", color: "bg-red-600" },
];

interface PodcastEpisodeCardProps {
  podcast: PodcastSource;
  episode: PodcastEpisode;
  onStartExercises: (level: string) => void;
}

export function PodcastEpisodeCard({ podcast, episode, onStartExercises }: PodcastEpisodeCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);
  const [showExerciseDialog, setShowExerciseDialog] = useState(false);

  const getDifficultyColor = (level: string) => {
    const difficulty = DIFFICULTY_LEVELS.find(d => d.code === level);
    return difficulty?.color || "bg-gray-500";
  };

  const renderEmbedPlayer = () => {
    // For Italian podcast - use specific Spotify embed
    if (podcast.language === 'italian') {
      return (
        <div className="w-full rounded-lg overflow-hidden">
          <iframe
            data-testid="embed-iframe"
            style={{ borderRadius: '12px' }}
            src="https://open.spotify.com/embed/episode/2sg5YB59AWkzVEfDy7kbpY?utm_source=generator"
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

    // Fallback player card for other languages
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

This excerpt demonstrates the type of content and language level appropriate for ${podcast.difficulty_level} learners.`;
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
            🎧 {podcast.difficulty_level}
          </Badge>
          <Badge variant="secondary">{podcast.category || 'General'}</Badge>
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
              This episode of {podcast.title} covers important topics for {podcast.difficulty_level} level learners, featuring authentic conversations and cultural insights.
            </p>
          </Card>
        </div>
      </div>

      {/* Podcast Embed */}
      <div className="space-y-4">
        {renderEmbedPlayer()}
        
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
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a 
                href={episode.episode_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Episode Page
              </a>
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
                    {level.code}
                  </div>
                  <div className="text-center">
                    <div className="font-semibold">{level.code}</div>
                    <div className="text-xs text-muted-foreground">{level.name.split(' ')[0]}</div>
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
              </a>
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span>RSS Feed:</span>
            <Button asChild variant="link" size="sm">
              <a href={podcast.rss_url} target="_blank" rel="noopener noreferrer">
                Podcast RSS
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