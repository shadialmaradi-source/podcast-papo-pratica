import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Clock, Star } from "lucide-react";

interface Podcast {
  id: string;
  title: string;
  description: string;
  duration: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  category: string;
  rating: number;
  thumbnail: string;
}

interface PodcastBrowserProps {
  onSelectPodcast: (podcast: Podcast) => void;
}

// Mock data for demonstration
const mockPodcasts: Podcast[] = [
  {
    id: "1",
    title: "Café da Manhã Brasileiro",
    description: "Uma conversa sobre tradições matinais no Brasil",
    duration: "12:30",
    difficulty: "beginner",
    category: "Cultura",
    rating: 4.8,
    thumbnail: "/api/placeholder/200/200"
  },
  {
    id: "2", 
    title: "Tecnologia e Futuro",
    description: "Discussão sobre inovações tecnológicas brasileiras",
    duration: "25:45",
    difficulty: "advanced",
    category: "Tecnologia",
    rating: 4.6,
    thumbnail: "/api/placeholder/200/200"
  },
  {
    id: "3",
    title: "História do Carnaval",
    description: "A evolução do carnaval brasileiro através dos séculos",
    duration: "18:15",
    difficulty: "intermediate",
    category: "História",
    rating: 4.9,
    thumbnail: "/api/placeholder/200/200"
  }
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "beginner": return "bg-success text-success-foreground";
    case "intermediate": return "bg-warning text-warning-foreground";
    case "advanced": return "bg-destructive text-destructive-foreground";
    default: return "bg-muted text-muted-foreground";
  }
};

export function PodcastBrowser({ onSelectPodcast }: PodcastBrowserProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  
  const difficulties = ["all", "beginner", "intermediate", "advanced"];
  
  const filteredPodcasts = selectedDifficulty === "all" 
    ? mockPodcasts 
    : mockPodcasts.filter(p => p.difficulty === selectedDifficulty);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Podcasts Brasileiros
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Selecione um podcast para praticar seu português. Cada episódio inclui exercícios personalizados para o seu nível.
        </p>
      </div>

      {/* Difficulty Filter */}
      <div className="flex flex-wrap gap-2 justify-center">
        {difficulties.map((difficulty) => (
          <Button
            key={difficulty}
            variant={selectedDifficulty === difficulty ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedDifficulty(difficulty)}
            className="transition-all duration-200"
          >
            {difficulty === "all" ? "Todos os Níveis" : difficulty}
          </Button>
        ))}
      </div>

      {/* Podcasts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPodcasts.map((podcast) => (
          <Card 
            key={podcast.id} 
            className="group hover:shadow-elevated transition-all duration-300 cursor-pointer border-0 shadow-card"
            onClick={() => onSelectPodcast(podcast)}
          >
            <CardHeader className="space-y-3">
              <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Play className="h-12 w-12 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
                  {podcast.title}
                </CardTitle>
                <div className="flex items-center gap-1 text-sm text-warning">
                  <Star className="h-3 w-3 fill-current" />
                  <span>{podcast.rating}</span>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">
                {podcast.description}
              </p>
              
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{podcast.duration}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {podcast.category}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between pt-2">
                <Badge className={`text-xs ${getDifficultyColor(podcast.difficulty)}`}>
                  Nível {podcast.difficulty}
                </Badge>
                <Button size="sm" variant="outline" className="gap-2">
                  <BookOpen className="h-3 w-3" />
                  Estudar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}