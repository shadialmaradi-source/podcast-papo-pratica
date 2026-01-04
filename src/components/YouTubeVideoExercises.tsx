import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
interface YouTubeVideoExercisesProps {
  videoId: string;
  onBack: () => void;
  onStartExercises: (level: string, intensity: string) => void;
}

interface VideoData {
  id: string;
  video_id: string;
  title: string;
  description: string;
  difficulty_level: string;
  thumbnail_url: string;
  duration: number;
}

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

const YouTubeVideoExercises: React.FC<YouTubeVideoExercisesProps> = ({ videoId, onBack, onStartExercises }) => {
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<string>('beginner');

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  const loadVideoData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (error) throw error;
      setVideoData(data);
    } catch (error) {
      console.error('Error loading video:', error);
      toast({
        title: "Error",
        description: "Failed to load video data",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartExercises = (level: string, intensity: string) => {
    console.log('Starting exercises:', { level, intensity, videoId });
    onStartExercises(level, intensity);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading video...</p>
        </div>
      </div>
    );
  }

  if (!videoData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Video not found</p>
          <Button onClick={onBack} className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video w-full">
                  <iframe
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoData.video_id}`}
                    title={videoData.title}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-t-lg"
                  ></iframe>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-2xl mb-2">{videoData.title}</CardTitle>
                    <Badge className="mb-4">
                      {mapDifficultyLevel(videoData.difficulty_level)}
                    </Badge>
                  </div>
                </div>
                <CardDescription className="text-base mt-4">
                  {videoData.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Exercise Selection Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>Practice Exercises</CardTitle>
                <CardDescription>
                  Choose your learning level and intensity to start practicing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">What you'll practice:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Vocabulary from the video</li>
                      <li>Listening comprehension</li>
                      <li>Grammar and sentence structure</li>
                      <li>Context-based exercises</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty Level</label>
                    <select 
                      value={selectedLevel}
                      onChange={(e) => setSelectedLevel(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background"
                    >
                      <option value="beginner">Beginner (A1-A2)</option>
                      <option value="intermediate">Intermediate (B1-B2)</option>
                      <option value="advanced">Advanced (C1-C2)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => handleStartExercises(selectedLevel, 'light')}
                    >
                      Light Mode
                      <span className="text-xs block">10 questions</span>
                    </Button>
                    <Button 
                      className="w-full"
                      onClick={() => handleStartExercises(selectedLevel, 'intense')}
                    >
                      Intense Mode
                      <span className="text-xs block">20 questions</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideoExercises;
