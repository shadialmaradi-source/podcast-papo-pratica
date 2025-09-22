import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Clock, Users, Plus, Search, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface YouTubeVideo {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string;
  duration: number | null;
  difficulty_level: string;
  description: string;
  exerciseCount: number;
  view_count: number;
  rating: number;
  total_ratings: number;
  status: string;
  created_at: string;
}

interface YouTubeLibraryProps {
  onVideoSelect: (videoId: string, difficulty: string) => void;
  onBack: () => void;
}

// Extract YouTube video ID from URL
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const formatDuration = (seconds: number | null): string => {
  if (!seconds) return 'N/A';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const difficultyColors: { [key: string]: string } = {
  beginner: "bg-green-500/10 text-green-700 dark:text-green-300",
  intermediate: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  advanced: "bg-red-500/10 text-red-700 dark:text-red-300",
  A1: "bg-green-500/10 text-green-700 dark:text-green-300",
  A2: "bg-green-600/10 text-green-700 dark:text-green-300",
  B1: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-300",
  B2: "bg-yellow-600/10 text-yellow-700 dark:text-yellow-300",
  C1: "bg-red-500/10 text-red-700 dark:text-red-300",
  C2: "bg-red-600/10 text-red-700 dark:text-red-300"
};

const YouTubeLibrary: React.FC<YouTubeLibraryProps> = ({ onVideoSelect, onBack }) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('youtube_videos')
        .select(`
          *,
          youtube_exercises(count)
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const videosWithExerciseCount = data?.map(video => ({
        ...video,
        exerciseCount: video.youtube_exercises?.[0]?.count || 0
      })) || [];

      setVideos(videosWithExerciseCount);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error",
        description: "Failed to load videos. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!newVideoUrl.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid YouTube URL",
        variant: "destructive"
      });
      return;
    }

    const videoId = extractVideoId(newVideoUrl.trim());
    if (!videoId) {
      toast({
        title: "Error",
        description: "Invalid YouTube URL format",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsAddingVideo(true);
      
      const { data, error } = await supabase.functions.invoke('process-youtube-video', {
        body: {
          videoUrl: newVideoUrl.trim(),
          language: 'english',
          difficulty: 'beginner'
        }
      });

      if (error) throw error;

      toast({
        title: "Video Added!",
        description: "Video is being processed. It will appear in the library once ready.",
      });

      setNewVideoUrl('');
      setShowAddDialog(false);
      
      // Refresh the videos list
      setTimeout(() => {
        fetchVideos();
      }, 2000);

    } catch (error) {
      console.error('Error adding video:', error);
      toast({
        title: "Error",
        description: "Failed to add video. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsAddingVideo(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const matchesDifficulty = selectedDifficulty === 'all' || video.difficulty_level === selectedDifficulty;
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const getDifficultyCount = (difficulty: string) => {
    return videos.filter(video => video.difficulty_level === difficulty).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">YouTube Video Library</h1>
            <p className="text-muted-foreground">Learn with community-contributed YouTube videos and AI-generated exercises</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Video
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add YouTube Video</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Input
                    placeholder="Paste YouTube video URL here"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAddVideo} 
                      disabled={isAddingVideo || !newVideoUrl.trim()}
                      className="flex-1"
                    >
                      {isAddingVideo ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Add Video'
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={onBack}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={selectedDifficulty} onValueChange={setSelectedDifficulty} className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-6">
            <TabsTrigger value="all">All ({videos.length})</TabsTrigger>
            <TabsTrigger value="beginner">Beginner ({getDifficultyCount('beginner')})</TabsTrigger>
            <TabsTrigger value="intermediate">Intermediate ({getDifficultyCount('intermediate')})</TabsTrigger>
            <TabsTrigger value="advanced">Advanced ({getDifficultyCount('advanced')})</TabsTrigger>
            <TabsTrigger value="A1">A1 ({getDifficultyCount('A1')})</TabsTrigger>
            <TabsTrigger value="B1">B1 ({getDifficultyCount('B1')})</TabsTrigger>
            <TabsTrigger value="C1">C1 ({getDifficultyCount('C1')})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedDifficulty} className="space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="h-48 bg-muted rounded-t-lg"></div>
                    <CardContent className="p-4 space-y-3">
                      <div className="h-6 bg-muted rounded"></div>
                      <div className="h-4 bg-muted rounded w-3/4"></div>
                      <div className="h-10 bg-muted rounded"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVideos.map((video) => (
                  <Card key={video.id} className="group hover:shadow-lg transition-all duration-300 hover-scale">
                    <CardHeader className="p-0">
                      <div className="relative">
                        <img 
                          src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
                          alt={video.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-lg flex items-center justify-center">
                          <Play className="h-12 w-12 text-white" />
                        </div>
                        <Badge className={`absolute top-2 right-2 ${difficultyColors[video.difficulty_level] || difficultyColors.beginner}`}>
                          {video.difficulty_level}
                        </Badge>
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration)}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <CardTitle className="text-lg leading-tight">{video.title}</CardTitle>
                      <CardDescription className="text-sm">{video.description}</CardDescription>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {video.view_count || 0} views
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="h-4 w-4" />
                          {video.exerciseCount} exercises
                        </div>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={() => onVideoSelect(video.video_id, video.difficulty_level)}
                      >
                        Start Learning
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!isLoading && filteredVideos.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium text-muted-foreground mb-2">No videos found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchTerm ? 'Try a different search term' : 'Try selecting a different difficulty level or add a new video.'}
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default YouTubeLibrary;