import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Play, BookOpen, Clock, Star, Search } from "lucide-react";
import { motion } from "framer-motion";
import { PodcastSource, getPodcastsByLanguage } from "@/services/podcastService";
import { ItalianPodcastCard } from "./ItalianPodcastCard";

interface PodcastLibraryProps {
  selectedLanguage: string;
  onSelectPodcast: (podcast: PodcastSource) => void;
  onStartExercises: (episode: any, level: string, intensity: string) => void;
}

const languageNames: Record<string, string> = {
  'portuguese': 'Português',
  'italian': 'Italiano'
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "A1": case "A2": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400";
    case "B1": case "B2": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "C1": case "C2": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400";
    default: return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

export function PodcastLibrary({ selectedLanguage, onSelectPodcast, onStartExercises }: PodcastLibraryProps) {
  const [podcasts, setPodcasts] = useState<PodcastSource[]>([]);
  const [filteredPodcasts, setFilteredPodcasts] = useState<PodcastSource[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedPodcast, setSelectedPodcast] = useState<PodcastSource | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<any>(null);
  
  const difficulties = ["all", "beginner", "intermediate", "advanced"];

  useEffect(() => {
    loadPodcasts();
  }, [selectedLanguage]);

  useEffect(() => {
    filterPodcasts();
  }, [podcasts, selectedDifficulty, searchQuery]);

  const loadPodcasts = async () => {
    console.log('PodcastLibrary: Loading podcasts for language:', selectedLanguage);
    setLoading(true);
    try {
      const data = await getPodcastsByLanguage(selectedLanguage);
      console.log('PodcastLibrary: Found podcasts:', data);
      setPodcasts(data);
    } catch (error) {
      console.error('PodcastLibrary: Error loading podcasts:', error);
      setPodcasts([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPodcasts = () => {
    let filtered = podcasts;

    // Filter by difficulty
    if (selectedDifficulty !== "all") {
      filtered = filtered.filter(p => p.difficulty_level === selectedDifficulty);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredPodcasts(filtered);
  };

  const handleSelectPodcast = (podcast: PodcastSource) => {
    onSelectPodcast(podcast);
  };

  const handleBackToList = () => {
    setSelectedPodcast(null);
    setSelectedEpisode(null);
  };

  // Show episode card if podcast and episode are selected
  // Note: Direct episode display removed to focus on podcast library functionality

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div className="text-center space-y-3 sm:space-y-4">
        <motion.h2 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
        >
          {languageNames[selectedLanguage]} Podcasts
        </motion.h2>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto px-4">
          Discover top-rated podcasts from Spotify charts. Choose episodes that match your learning level and start practicing!
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search podcasts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
          {difficulties.map((difficulty) => (
            <Button
              key={difficulty}
              variant={selectedDifficulty === difficulty ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedDifficulty(difficulty)}
              className="transition-all duration-200 text-xs sm:text-sm"
            >
              {difficulty === "all" ? "All Levels" : difficulty}
            </Button>
          ))}
        </div>
      </div>

      {/* Podcasts Grid */}
      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading podcasts...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredPodcasts.map((podcast, index) => (
          <motion.div
            key={podcast.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card 
              className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 shadow-lg h-full"
              onClick={() => handleSelectPodcast(podcast)}
            >
              <CardHeader className="space-y-3">
                <div className="relative aspect-square rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 overflow-hidden">
                  {podcast.thumbnail_url ? (
                    <img 
                      src={podcast.thumbnail_url} 
                      alt={podcast.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-12 w-12 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                  
                  {/* Spotify Chart Rank Badge */}
                  <Badge 
                    className="absolute top-2 left-2 bg-green-500 text-white"
                    variant="secondary"
                  >
                    #{podcast.spotify_chart_rank}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {podcast.title}
                  </CardTitle>
                  <div className="flex items-center justify-between">
                    <Badge 
                      className={`text-xs ${getDifficultyColor(podcast.difficulty_level)}`}
                      variant="outline"
                    >
                      Level {podcast.difficulty_level}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {podcast.category}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {podcast.description}
                </p>
                
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span>Top Chart</span>
                  </div>
                  <Button size="sm" variant="outline" className="gap-2">
                    <BookOpen className="h-3 w-3" />
                    View Episodes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        </div>
      )}

      {filteredPodcasts.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {searchQuery 
              ? `No podcasts found matching "${searchQuery}"`
              : `No podcasts available for ${selectedDifficulty === "all" ? "this language" : `level ${selectedDifficulty}`}`
            }
          </p>
        </div>
      )}
    </div>
  );
}