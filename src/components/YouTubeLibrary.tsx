import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Clock, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  exerciseCount: number;
  viewCount: string;
  url: string;
}

interface YouTubeLibraryProps {
  onVideoSelect: (videoId: string, difficulty: string) => void;
  onBack: () => void;
}

const sampleVideos: YouTubeVideo[] = [
  {
    id: "dQw4w9WgXcQ",
    title: "Italian Basics: Greetings and Common Phrases",
    thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
    duration: "8:45",
    difficulty: "beginner",
    description: "Learn essential Italian greetings and everyday expressions perfect for beginners.",
    exerciseCount: 12,
    viewCount: "245K",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  },
  {
    id: "jNQXAC9IVRw",
    title: "Ordering Food in Italian Restaurants",
    thumbnail: "https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg",
    duration: "12:30",
    difficulty: "beginner",
    description: "Master the art of ordering food and drinks in Italian restaurants.",
    exerciseCount: 15,
    viewCount: "180K",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw"
  },
  {
    id: "y6120QOlsfU",
    title: "Italian Past Tense Explained",
    thumbnail: "https://img.youtube.com/vi/y6120QOlsfU/maxresdefault.jpg",
    duration: "15:20",
    difficulty: "intermediate",
    description: "Comprehensive guide to Italian past tense forms and usage.",
    exerciseCount: 18,
    viewCount: "95K",
    url: "https://www.youtube.com/watch?v=y6120QOlsfU"
  },
  {
    id: "kJQP7kiw5Fk",
    title: "Business Italian: Professional Conversations",
    thumbnail: "https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg",
    duration: "22:15",
    difficulty: "intermediate",
    description: "Learn professional Italian for business meetings and networking.",
    exerciseCount: 20,
    viewCount: "67K",
    url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk"
  },
  {
    id: "ZbZSe6N_BXs",
    title: "Advanced Italian Literature Discussion",
    thumbnail: "https://img.youtube.com/vi/ZbZSe6N_BXs/maxresdefault.jpg",
    duration: "35:40",
    difficulty: "advanced",
    description: "Deep dive into Italian literary works and complex grammatical structures.",
    exerciseCount: 25,
    viewCount: "42K",
    url: "https://www.youtube.com/watch?v=ZbZSe6N_BXs"
  },
  {
    id: "HITliHqIGNQ",
    title: "Italian Philosophy and Abstract Concepts",
    thumbnail: "https://img.youtube.com/vi/HITliHqIGNQ/maxresdefault.jpg",
    duration: "28:55",
    difficulty: "advanced",
    description: "Explore complex philosophical discussions in Italian with advanced vocabulary.",
    exerciseCount: 22,
    viewCount: "38K",
    url: "https://www.youtube.com/watch?v=HITliHqIGNQ"
  }
];

const difficultyColors = {
  beginner: "bg-green-500/10 text-green-700 dark:text-green-300",
  intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  advanced: "bg-red-500/10 text-red-700 dark:text-red-300"
};

const YouTubeLibrary: React.FC<YouTubeLibraryProps> = ({ onVideoSelect, onBack }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const filteredVideos = selectedDifficulty === 'all' 
    ? sampleVideos 
    : sampleVideos.filter(video => video.difficulty === selectedDifficulty);

  const getDifficultyCount = (difficulty: string) => {
    return sampleVideos.filter(video => video.difficulty === difficulty).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">YouTube Video Library</h1>
            <p className="text-muted-foreground">Practice Italian with curated YouTube videos and interactive exercises</p>
          </div>
          <Button variant="outline" onClick={onBack}>
            Back to Dashboard
          </Button>
        </div>

        <Tabs value={selectedDifficulty} onValueChange={setSelectedDifficulty} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="all">All Videos ({sampleVideos.length})</TabsTrigger>
            <TabsTrigger value="beginner">Beginner ({getDifficultyCount('beginner')})</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate ({getDifficultyCount('intermediate')})</TabsTrigger>
            <TabsTrigger value="advanced">Advanced ({getDifficultyCount('advanced')})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedDifficulty} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => (
                <Card key={video.id} className="group hover:shadow-lg transition-all duration-300 hover-scale">
                  <CardHeader className="p-0">
                    <div className="relative">
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-lg flex items-center justify-center">
                        <Play className="h-12 w-12 text-white" />
                      </div>
                      <Badge className={`absolute top-2 right-2 ${difficultyColors[video.difficulty]}`}>
                        {video.difficulty}
                      </Badge>
                      <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {video.duration}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <CardTitle className="text-lg leading-tight">{video.title}</CardTitle>
                    <CardDescription className="text-sm">{video.description}</CardDescription>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {video.viewCount} views
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {video.exerciseCount} exercises
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={() => onVideoSelect(video.id, video.difficulty)}
                    >
                      Start Learning
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredVideos.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No videos found</h3>
                <p className="text-sm text-muted-foreground">Try selecting a different difficulty level.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default YouTubeLibrary;