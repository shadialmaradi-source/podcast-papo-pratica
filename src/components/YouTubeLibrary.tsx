import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, BookOpen, Clock, Users, Plus, Search, Loader2, Trash2, AlertCircle, ExternalLink } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

// Map CEFR levels to readable difficulty names
const mapDifficultyLevel = (level: string): string => {
  switch (level?.toUpperCase()) {
    case 'A1':
    case 'A2':
      return 'Beginner';
    case 'B1':
    case 'B2':
      return 'Intermediate';
    case 'C1':
    case 'C2':
      return 'Advanced';
    case 'BEGINNER':
      return 'Beginner';
    case 'INTERMEDIATE':
      return 'Intermediate';
    case 'ADVANCED':
      return 'Advanced';
    default:
      return level || 'Unknown';
  }
};

// Mock YouTube videos for testing
const mockYouTubeVideos: YouTubeVideo[] = [
  {
    id: 'mock-1',
    video_id: 'dQw4w9WgXcQ',
    title: 'English Conversation for Beginners - Daily Phrases',
    thumbnail_url: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
    duration: 480,
    difficulty_level: 'beginner',
    description: 'Learn essential English conversation phrases for everyday situations',
    exerciseCount: 12,
    view_count: 1250,
    rating: 4.5,
    total_ratings: 45,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  },
  {
    id: 'mock-2',
    video_id: 'jNQXAC9IVRw',
    title: 'Intermediate English - Business Communication',
    thumbnail_url: 'https://img.youtube.com/vi/jNQXAC9IVRw/maxresdefault.jpg',
    duration: 720,
    difficulty_level: 'intermediate',
    description: 'Master professional English for business meetings and presentations',
    exerciseCount: 15,
    view_count: 2340,
    rating: 4.7,
    total_ratings: 78,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  },
  {
    id: 'mock-3',
    video_id: 'yPYZpwSpKmA',
    title: 'Advanced English - Academic Writing & Critical Thinking',
    thumbnail_url: 'https://img.youtube.com/vi/yPYZpwSpKmA/maxresdefault.jpg',
    duration: 900,
    difficulty_level: 'advanced',
    description: 'Develop advanced writing skills and critical analysis techniques',
    exerciseCount: 20,
    view_count: 3120,
    rating: 4.9,
    total_ratings: 102,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  },
  {
    id: 'mock-4',
    video_id: '9bZkp7q19f0',
    title: 'Beginner English Grammar - Simple Present Tense',
    thumbnail_url: 'https://img.youtube.com/vi/9bZkp7q19f0/maxresdefault.jpg',
    duration: 360,
    difficulty_level: 'beginner',
    description: 'Understanding and using the simple present tense correctly',
    exerciseCount: 10,
    view_count: 890,
    rating: 4.3,
    total_ratings: 32,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  },
  {
    id: 'mock-5',
    video_id: 'kJQP7kiw5Fk',
    title: 'Intermediate English - Idioms and Expressions',
    thumbnail_url: 'https://img.youtube.com/vi/kJQP7kiw5Fk/maxresdefault.jpg',
    duration: 540,
    difficulty_level: 'intermediate',
    description: 'Learn common idioms and expressions used by native speakers',
    exerciseCount: 18,
    view_count: 1870,
    rating: 4.6,
    total_ratings: 67,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  },
  {
    id: 'mock-6',
    video_id: 'lDK9QqIzhwk',
    title: 'Advanced English - Debate and Argumentation Skills',
    thumbnail_url: 'https://img.youtube.com/vi/lDK9QqIzhwk/maxresdefault.jpg',
    duration: 840,
    difficulty_level: 'advanced',
    description: 'Master the art of constructing and defending complex arguments',
    exerciseCount: 25,
    view_count: 2650,
    rating: 4.8,
    total_ratings: 89,
    status: 'completed',
    created_at: new Date().toISOString(),
    language: 'english'
  }
];

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
  added_by_user_id?: string | null;
  is_curated?: boolean;
  language: string;
}

interface YouTubeLibraryProps {
  onVideoSelect: (videoId: string, difficulty: string) => void;
  onBack: () => void;
  selectedLanguage?: string;
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

const YouTubeLibrary: React.FC<YouTubeLibraryProps> = ({ onVideoSelect, onBack, selectedLanguage }) => {
  const { user } = useAuth();
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [isAddingVideo, setIsAddingVideo] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [selectedFailedVideo, setSelectedFailedVideo] = useState<YouTubeVideo | null>(null);
  const [manualTranscript, setManualTranscript] = useState('');
  const [transcriptLanguage, setTranscriptLanguage] = useState('');
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('youtube_videos')
        .select(`
          *,
          youtube_exercises(count)
        `);

      // Filter by language if provided
      if (selectedLanguage) {
        query = query.eq('language', selectedLanguage);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const videosWithExerciseCount = data?.map(video => ({
        ...video,
        exerciseCount: video.youtube_exercises?.[0]?.count || 0
      })) || [];

      setVideos(videosWithExerciseCount);
    } catch (error) {
      console.error('Error fetching videos:', error);
      toast({
        title: "Error loading videos",
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
          language: selectedLanguage || 'italian',
          difficulty: 'beginner',
          userId: user?.id
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

  const handleDeleteVideo = async (videoId: string, videoTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${videoTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('youtube_videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast({
        title: "Video Deleted",
        description: "The video has been successfully removed.",
      });

      // Refresh the videos list
      fetchVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      toast({
        title: "Error",
        description: "Failed to delete video. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOpenTranscriptDialog = (video: YouTubeVideo) => {
    setSelectedFailedVideo(video);
    setTranscriptLanguage(video.language);
    setManualTranscript('');
    setShowTranscriptDialog(true);
  };

  const handleGenerateExercises = async () => {
    if (!selectedFailedVideo || !manualTranscript || manualTranscript.length < 100) {
      toast({
        title: "Invalid Transcript",
        description: "Please enter at least 100 characters of transcript text.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingExercises(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-exercises-from-transcript', {
        body: {
          videoId: selectedFailedVideo.id,
          transcript: manualTranscript,
          language: transcriptLanguage
        }
      });

      if (error) throw error;

      toast({
        title: "Success!",
        description: `Generated ${data.exerciseCount} exercises. Video is now ready to use.`,
      });

      setShowTranscriptDialog(false);
      setManualTranscript('');
      setSelectedFailedVideo(null);
      
      // Refresh the videos list
      fetchVideos();
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate exercises. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingExercises(false);
    }
  };

  const filteredVideos = videos.filter(video => {
    const normalizedVideoDifficulty = mapDifficultyLevel(video.difficulty_level).toLowerCase();
    const normalizedSelectedDifficulty = selectedDifficulty.toLowerCase();
    
    // Filter by "My Videos" tab
    if (selectedDifficulty === 'my-videos') {
      const matchesUser = (video as any).added_by_user_id === user?.id;
      const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           video.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesUser && matchesSearch;
    }
    
    const matchesDifficulty = selectedDifficulty === 'all' || 
                             normalizedVideoDifficulty === normalizedSelectedDifficulty ||
                             video.difficulty_level.toLowerCase() === normalizedSelectedDifficulty;
    const matchesSearch = video.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         video.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDifficulty && matchesSearch;
  });

  const getDifficultyCount = (difficulty: string) => {
    if (difficulty === 'my-videos') {
      return videos.filter(video => (video as any).added_by_user_id === user?.id).length;
    }
    return videos.filter(video => {
      const normalizedVideoDifficulty = mapDifficultyLevel(video.difficulty_level).toLowerCase();
      return normalizedVideoDifficulty === difficulty.toLowerCase() || 
             video.difficulty_level.toLowerCase() === difficulty.toLowerCase();
    }).length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">YouTube Video Library</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Learn with community-contributed YouTube videos and AI-generated exercises</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex-1 sm:flex-none">
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
            <Button variant="outline" onClick={onBack} className="flex-1 sm:flex-none">
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
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 mb-4 sm:mb-6">
            <TabsTrigger value="all" className="text-xs sm:text-sm">All ({videos.length})</TabsTrigger>
            <TabsTrigger value="my-videos" className="text-xs sm:text-sm">My Videos ({getDifficultyCount('my-videos')})</TabsTrigger>
            <TabsTrigger value="beginner" className="text-xs sm:text-sm">Beginner ({getDifficultyCount('beginner')})</TabsTrigger>
            <TabsTrigger value="intermediate" className="text-xs sm:text-sm">Intermediate ({getDifficultyCount('intermediate')})</TabsTrigger>
            <TabsTrigger value="advanced" className="text-xs sm:text-sm">Advanced ({getDifficultyCount('advanced')})</TabsTrigger>
          </TabsList>

          <TabsContent value={selectedDifficulty} className="space-y-4 sm:space-y-6">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredVideos.map((video) => (
                  <Card key={video.id} className="group hover:shadow-lg transition-all duration-300 hover-scale">
                    <CardHeader className="p-0">
                      <div className="relative">
                        <img 
                          src={video.thumbnail_url || `https://img.youtube.com/vi/${video.video_id}/maxresdefault.jpg`}
                          alt={video.title}
                          className="w-full h-48 object-cover rounded-t-lg"
                        />
                        {video.status === 'completed' ? (
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-t-lg flex items-center justify-center">
                            <Play className="h-12 w-12 text-white" />
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/60 rounded-t-lg flex items-center justify-center">
                            <div className="text-center text-white p-4">
                              {video.status === 'processing' ? (
                                <>
                                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                                  <p className="text-sm">Processing...</p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium">Failed</p>
                                  <p className="text-xs mt-1">Try another video</p>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                        <Badge className={`absolute top-2 right-2 ${difficultyColors[video.difficulty_level] || difficultyColors.beginner}`}>
                          {mapDifficultyLevel(video.difficulty_level)}
                        </Badge>
                        {video.added_by_user_id === user?.id && (
                          <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 left-2 h-8 w-8 opacity-80 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVideo(video.id, video.title);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                        {video.status === 'completed' && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(video.duration)}
                          </div>
                        )}
                        {video.status === 'failed' && (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 p-4">
                            <AlertCircle className="h-8 w-8 text-destructive animate-pulse" />
                            <Badge variant="destructive" className="text-xs">Failed - Add Transcript</Badge>
                            <Button 
                              size="sm" 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTranscriptDialog(video);
                              }}
                              className="mt-2"
                            >
                              Add Transcript Manually
                            </Button>
                            <p className="text-xs text-center text-muted-foreground mt-1">
                              Transcript unavailable
                            </p>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 space-y-3">
                      <CardTitle className="text-base sm:text-lg leading-tight line-clamp-2">{video.title}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-2">{video.description}</CardDescription>
                      
                      {video.status === 'completed' && (
                        <>
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
                        </>
                      )}
                      
                      {video.status !== 'completed' && (
                        <p className="text-xs text-center text-muted-foreground">
                          {video.status === 'processing' ? 'Video is being processed. Check back soon!' : 'Processing failed. Please try another video.'}
                        </p>
                      )}
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

      {/* Manual Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transcript Manually</DialogTitle>
            <DialogDescription>
              The automatic transcript generation failed for this video. You can manually add a transcript to generate exercises.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                How to get the transcript:
              </h4>
              <ol className="text-sm space-y-2 list-decimal list-inside text-muted-foreground">
                <li>Visit the transcript website using the link below</li>
                <li>Paste your YouTube video URL there</li>
                <li>Copy the generated transcript</li>
                <li>Paste it in the text box below</li>
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => window.open('https://youtubetranscript.com', '_blank')}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Get Transcript from youtubetranscript.com
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="transcript">Transcript Text</Label>
              <Textarea
                id="transcript"
                placeholder="Paste the transcript here... (minimum 100 characters)"
                value={manualTranscript}
                onChange={(e) => setManualTranscript(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
              <div className="flex items-center justify-between text-xs">
                <span className={`${
                  manualTranscript.length < 100 
                    ? 'text-destructive' 
                    : manualTranscript.length < 500 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                }`}>
                  {manualTranscript.length} characters
                </span>
                <span className="text-muted-foreground">
                  {manualTranscript.length < 100 
                    ? `${100 - manualTranscript.length} more needed` 
                    : '✓ Ready'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Video Language</Label>
              <Select value={transcriptLanguage} onValueChange={setTranscriptLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="italian">Italian</SelectItem>
                  <SelectItem value="spanish">Spanish</SelectItem>
                  <SelectItem value="french">French</SelectItem>
                  <SelectItem value="german">German</SelectItem>
                  <SelectItem value="portuguese">Portuguese</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setShowTranscriptDialog(false)}
              disabled={isGeneratingExercises}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerateExercises}
              disabled={manualTranscript.length < 100 || !transcriptLanguage || isGeneratingExercises}
            >
              {isGeneratingExercises ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating exercises...
                </>
              ) : (
                'Generate Exercises'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default YouTubeLibrary;