import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Clock, 
  FileText, 
  BookOpen, 
  ExternalLink,
  Target
} from "lucide-react";
import { motion } from "framer-motion";
import { PodcastSource, PodcastEpisode } from "@/services/podcastService";

interface ItalianPodcastCardProps {
  podcast: PodcastSource;
  episode: PodcastEpisode;
  onStartExercises: (episode: PodcastEpisode, level: string) => void;
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "A1": case "A2": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400";
    case "B1": case "B2": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "C1": case "C2": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400";
    default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

const levels = [
  { code: "A1", name: "Beginner (A1)", color: "bg-green-500" },
  { code: "A2", name: "Elementary (A2)", color: "bg-green-600" },
  { code: "B1", name: "Intermediate (B1)", color: "bg-yellow-500" },
  { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-yellow-600" },
  { code: "C1", name: "Advanced (C1)", color: "bg-red-500" },
  { code: "C2", name: "Proficiency (C2)", color: "bg-red-600" },
];

export function ItalianPodcastCard({ podcast, episode, onStartExercises }: ItalianPodcastCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const renderEmbedPlayer = () => {
    // Use specific episode embed iframe
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

    // Fallback card with link to episode
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center gap-4">
          <img 
            src={podcast.thumbnail_url || 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=400&fit=crop'} 
            alt={podcast.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold">{episode.title}</h4>
            <p className="text-sm text-muted-foreground">{episode.duration ? Math.floor(episode.duration / 60) : 35} min</p>
          </div>
          <Button 
            onClick={() => window.open(episode.episode_url || 'https://www.podcastitaliano.com/podcast-episode/storia-della-televisione-italiana', '_blank')}
          >
            <Play className="h-4 w-4 mr-2" />
            Ascolta
          </Button>
        </div>
      </Card>
    );
  };

  const getTranscriptExcerpt = () => {
    if (episode.transcript) {
      return episode.transcript.substring(0, 500) + "...";
    }
    return "Bentornato o bentornata a un nuovo episodio di Podcast Italiano, un podcast per imparare l'italiano attraverso contenuti interessanti. L'episodio di oggi è imperdibile: faremo un viaggio nel tempo alla scoperta della storia della televisione italiana...";
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
            🇮🇹 {podcast.difficulty_level}
          </Badge>
          <Badge variant="secondary">{podcast.category}</Badge>
        </div>
        
        <div>
          <h1 className="text-2xl font-bold mb-2">{episode.title}</h1>
          <p className="text-muted-foreground mb-4">{episode.description}</p>
          
          {/* Auto-generated summary */}
          <Card className="p-4 bg-muted/30">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              📝 Sommario
            </h3>
            <p className="text-sm text-muted-foreground">
              Questo episodio di {podcast.title} copre la storia della televisione italiana, perfetto per studenti di livello {podcast.difficulty_level}.
            </p>
          </Card>
        </div>
      </div>

      {/* Podcast Embed */}
      <div className="space-y-4">
        {renderEmbedPlayer()}
        
        {/* Metadata */}
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{episode.duration ? Math.floor(episode.duration / 60) : 35} min</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Autore:</span>
              <span>Podcast Italiano</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a 
                href="https://www.podcastitaliano.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Sito Ufficiale
              </a>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs">Podcast Italiano</span>
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
              Mostra Trascrizione
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Estratto della Trascrizione</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-4">
              <div className="space-y-4 text-sm leading-relaxed">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">
                    Nota: Questo è un estratto. La trascrizione completa è disponibile sul sito ufficiale.
                  </p>
                </div>
                <p className="text-muted-foreground">
                  {getTranscriptExcerpt()}
                </p>
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" size="sm">
                    <a href="https://www.podcastitaliano.com/podcast-episode/storia-della-televisione-italiana" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Vedi Trascrizione Completa
                    </a>
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Exercises Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <BookOpen className="h-4 w-4" />
              Inizia Esercizi
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Scegli il Livello degli Esercizi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                📌 Gli esercizi sono generati basandosi sul contenuto di questo episodio:
              </p>
              <div className="grid grid-cols-2 gap-3">
                {levels.map((level) => (
                  <motion.div
                    key={level.code}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 flex flex-col gap-2"
                      onClick={() => onStartExercises(episode, level.code)}
                    >
                      <Badge className={`${level.color} text-white`}>
                        {level.code}
                      </Badge>
                      <span className="text-sm font-medium">
                        {level.name}
                      </span>
                    </Button>
                  </motion.div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Links Section */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          🔗 Collegamenti & Attribuzione
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Episodio Completo:</span>
            <Button asChild variant="link" size="sm">
              <a href="https://www.podcastitaliano.com/podcast-episode/storia-della-televisione-italiana" target="_blank" rel="noopener noreferrer">
                Podcast Italiano
              </a>
            </Button>
          </div>
          <div className="flex justify-between items-center">
            <span>Spotify:</span>
            <Button asChild variant="link" size="sm">
              <a href="https://open.spotify.com/show/1y4WrXQPfvoBCyWZBx5vFi" target="_blank" rel="noopener noreferrer">
                Ascolta su Spotify
              </a>
            </Button>
          </div>
          <div className="pt-2 border-t text-xs text-muted-foreground">
            © Podcast Italiano • Contenuto utilizzato per scopi educativi
          </div>
        </div>
      </Card>
    </motion.div>
  );
}