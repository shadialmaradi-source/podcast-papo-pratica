import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Play, 
  Clock, 
  FileText, 
  BookOpen, 
  ExternalLink,
  Target,
  Copyright
} from "lucide-react";
import { motion } from "framer-motion";
import { PodcastSource, PodcastEpisode } from "@/data/podcastSources";

interface PodcastEpisodeCardProps {
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

export function PodcastEpisodeCard({ podcast, episode, onStartExercises }: PodcastEpisodeCardProps) {
  const [showTranscript, setShowTranscript] = useState(false);

  const renderEmbedPlayer = () => {
    if (podcast.embed_type === 'spotify' && podcast.spotify_url) {
      return (
        <div className="w-full h-80 rounded-lg overflow-hidden">
          <iframe
            src={podcast.embed_url}
            width="100%"
            height="100%"
            allowFullScreen
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="border-0"
          />
        </div>
      );
    }
    
    if (podcast.embed_type === 'apple' && podcast.apple_podcasts_url) {
      return (
        <div className="w-full h-80 rounded-lg overflow-hidden">
          <iframe
            src={podcast.embed_url}
            width="100%"
            height="100%"
            allowFullScreen
            loading="lazy"
            className="border-0"
          />
        </div>
      );
    }

    // Custom embed or fallback
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="flex items-center gap-4">
          <img 
            src={podcast.thumbnail_url} 
            alt={podcast.title}
            className="w-16 h-16 rounded-lg object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold">{episode.title}</h4>
            <p className="text-sm text-muted-foreground">{episode.duration}</p>
          </div>
          <Button asChild>
            <a href={podcast.official_url} target="_blank" rel="noopener noreferrer">
              <Play className="h-4 w-4 mr-2" />
              Listen
            </a>
          </Button>
        </div>
      </Card>
    );
  };

  const generateMockTranscript = () => {
    const topics = {
      spanish: {
        A1: "Hola, me llamo María. Soy de España. Tengo veinte años. Me gusta la música y el cine.",
        A2: "En este episodio hablamos sobre la comida española. La paella es un plato muy famoso.",
        B1: "Hoy discutimos las tradiciones culturales de América Latina y su importancia en la sociedad moderna.",
        B2: "Analizamos los cambios económicos en España durante la última década y su impacto social.",
        C1: "Exploramos las complejidades del sistema político latinoamericano y sus desafíos contemporáneos.",
        C2: "Una reflexión profunda sobre la literatura hispanoamericana y su influencia en el pensamiento global."
      },
      portuguese: {
        A1: "Olá, eu sou João. Moro no Brasil. Gosto de futebol e música brasileira.",
        A2: "Neste episódio falamos sobre a cultura brasileira e suas tradições regionais.",
        B1: "Hoje discutimos a vida nas grandes cidades do Brasil e os desafios urbanos.",
        B2: "Analisamos as mudanças sociais no Brasil moderno e o papel da tecnologia.",
        C1: "Exploramos a complexidade da identidade brasileira na era da globalização.",
        C2: "Uma análise crítica da filosofia lusófona e sua contribuição para o pensamento mundial."
      }
    };

    const baseText = topics[podcast.language][podcast.difficulty_level];
    return `${baseText}\n\nEste é um trecho de exemplo do episódio "${episode.title}". O conteúdo completo está disponível no link oficial do podcast.\n\n[Continua no áudio completo...]`;
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
          <Badge variant="secondary">{podcast.category}</Badge>
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
              {episode.excerpt || `This episode of ${podcast.title} covers important topics for ${podcast.difficulty_level} level learners, featuring authentic conversations and cultural insights.`}
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
              <span>{episode.duration}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium">Author:</span>
              <span>{podcast.author}</span>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
              <a 
                href={podcast.official_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Official Page
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Copyright className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs">{podcast.copyright}</span>
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
                    Note: This is a short excerpt. Full transcript available at the official podcast page.
                  </p>
                </div>
                {generateMockTranscript().split('\n').map((paragraph, index) => (
                  <p key={index} className="text-muted-foreground">
                    {paragraph.trim()}
                  </p>
                ))}
                <div className="pt-4 border-t">
                  <Button asChild variant="outline" size="sm">
                    <a href={episode.transcript_url || podcast.official_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      View Full Transcript
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
              Start Exercises
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Choose Exercise Level
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                📌 Exercises are generated based on this episode's content and your selected level:
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
          🔗 Links & Attribution
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span>Full Episode:</span>
            <Button asChild variant="link" size="sm">
              <a href={podcast.official_url} target="_blank" rel="noopener noreferrer">
                {podcast.title} Official Page
              </a>
            </Button>
          </div>
          {podcast.spotify_url && (
            <div className="flex justify-between items-center">
              <span>Spotify:</span>
              <Button asChild variant="link" size="sm">
                <a href={podcast.spotify_url} target="_blank" rel="noopener noreferrer">
                  Listen on Spotify
                </a>
              </Button>
            </div>
          )}
          {episode.transcript_url && (
            <div className="flex justify-between items-center">
              <span>Full Transcript:</span>
              <Button asChild variant="link" size="sm">
                <a href={episode.transcript_url} target="_blank" rel="noopener noreferrer">
                  View Complete Transcript
                </a>
              </Button>
            </div>
          )}
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {podcast.copyright} • Content used for educational purposes only
          </div>
        </div>
      </Card>
    </motion.div>
  );
}