import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface YouTubeVideoExercisesProps {
  videoId: string;
  onBack: () => void;
  onStartExercises: (level: string) => void;
}

interface VideoData {
  id: string;
  video_id: string;
  title: string;
  description: string;
  difficulty_level: string;
  thumbnail_url: string;
  duration: number;
  language?: string;
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLevel, setGeneratingLevel] = useState<string | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingLevel, setRegeneratingLevel] = useState<string | null>(null);

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  const loadVideoData = async () => {
    try {
      setIsLoading(true);
      
      // Try to find by YouTube video_id first
      let { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      // If not found, try by database UUID
      if (error || !data) {
        const { data: dataById, error: errorById } = await supabase
          .from('youtube_videos')
          .select('*')
          .eq('id', videoId)
          .single();
        
        if (!errorById && dataById) {
          data = dataById;
          error = null;
        }
      }

      if (error || !data) {
        console.error('Video not found:', error);
        toast({
          title: "Error",
          description: "Video not found",
          variant: "destructive"
        });
        return;
      }
      
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

  const handleStartExercises = async (level: string) => {
    if (!videoData) return;
    
    setIsGenerating(true);
    setGeneratingLevel(level);
    
    const dbLevel = level.toLowerCase();
    
    try {
      // Check if exercises already exist for this level
      const { count } = await supabase
        .from('youtube_exercises')
        .select('id', { count: 'exact', head: true })
        .eq('video_id', videoData.id)
        .eq('difficulty', dbLevel);

      console.log(`[YouTubeVideoExercises] Exercises count for ${dbLevel}:`, count);

      if (!count || count === 0) {
        console.log(`[YouTubeVideoExercises] No exercises found, generating...`);
        
        // Fetch transcript from DB
        const { data: transcriptData, error: transcriptError } = await supabase
          .from('youtube_transcripts')
          .select('transcript')
          .eq('video_id', videoData.id)
          .single();

        if (transcriptError || !transcriptData?.transcript) {
          console.error('[YouTubeVideoExercises] No transcript found:', transcriptError);
          toast({ 
            title: "Errore", 
            description: "Nessun transcript disponibile per questo video",
            variant: "destructive"
          });
          setIsGenerating(false);
          setGeneratingLevel(null);
          return;
        }

        console.log(`[YouTubeVideoExercises] Transcript found, length: ${transcriptData.transcript.length}`);

        // Generate exercises via edge function
        const { data, error } = await supabase.functions.invoke('generate-level-exercises', {
          body: { 
            videoId: videoData.id, 
            level: dbLevel, 
            transcript: transcriptData.transcript,
            language: videoData.language || 'italian'
          }
        });

        if (error) {
          console.error('[YouTubeVideoExercises] Edge function error:', error);
          toast({ 
            title: "Errore generazione", 
            description: error.message || "Impossibile generare esercizi",
            variant: "destructive"
          });
          setIsGenerating(false);
          setGeneratingLevel(null);
          return;
        }

        if (data?.error) {
          console.error('[YouTubeVideoExercises] Generation error:', data.error);
          toast({ 
            title: "Errore generazione", 
            description: data.error,
            variant: "destructive"
          });
          setIsGenerating(false);
          setGeneratingLevel(null);
          return;
        }

        console.log(`[YouTubeVideoExercises] Generation successful:`, data);
        toast({
          title: "Esercizi generati! 🎯",
          description: `${data?.count || 10} esercizi creati per il livello ${level}`,
        });
      } else {
        console.log(`[YouTubeVideoExercises] ${count} exercises already exist for ${dbLevel}`);
      }

      setIsGenerating(false);
      setGeneratingLevel(null);
      onStartExercises(level);
      
    } catch (err) {
      console.error('[YouTubeVideoExercises] Unexpected error:', err);
      toast({ 
        title: "Errore", 
        description: "Si è verificato un errore imprevisto",
        variant: "destructive"
      });
      setIsGenerating(false);
      setGeneratingLevel(null);
    }
  };

  const handleRegenerateExercises = async (level: string) => {
    if (!videoData) return;
    
    setIsRegenerating(true);
    setRegeneratingLevel(level);
    const dbLevel = level.toLowerCase();
    
    try {
      // Delete existing exercises for this level
      const { error: deleteError } = await supabase
        .from('youtube_exercises')
        .delete()
        .eq('video_id', videoData.id)
        .eq('difficulty', dbLevel);

      if (deleteError) {
        console.error('[YouTubeVideoExercises] Delete error:', deleteError);
        toast({
          title: "Errore",
          description: "Impossibile eliminare esercizi esistenti",
          variant: "destructive"
        });
        setIsRegenerating(false);
        setRegeneratingLevel(null);
        return;
      }

      console.log(`[YouTubeVideoExercises] Deleted exercises for ${dbLevel}, regenerating...`);

      // Fetch transcript
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', videoData.id)
        .single();

      if (transcriptError || !transcriptData?.transcript) {
        toast({ 
          title: "Errore", 
          description: "Nessun transcript disponibile",
          variant: "destructive"
        });
        setIsRegenerating(false);
        setRegeneratingLevel(null);
        return;
      }

      // Generate new exercises
      const { data, error } = await supabase.functions.invoke('generate-level-exercises', {
        body: { 
          videoId: videoData.id, 
          level: dbLevel, 
          transcript: transcriptData.transcript,
          language: videoData.language || 'italian'
        }
      });

      if (error || data?.error) {
        toast({ 
          title: "Errore rigenerazione", 
          description: error?.message || data?.error || "Errore sconosciuto",
          variant: "destructive"
        });
        setIsRegenerating(false);
        setRegeneratingLevel(null);
        return;
      }

      toast({
        title: "Esercizi rigenerati! 🎯",
        description: `${data?.count || 10} nuovi esercizi creati per ${level}`,
      });

      setIsRegenerating(false);
      setRegeneratingLevel(null);
      onStartExercises(level);
      
    } catch (err) {
      console.error('[YouTubeVideoExercises] Regenerate error:', err);
      toast({ 
        title: "Errore", 
        description: "Errore imprevisto durante la rigenerazione",
        variant: "destructive"
      });
      setIsRegenerating(false);
      setRegeneratingLevel(null);
    }
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
                  Choose your learning level to start practicing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">Cosa praticherai:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Vocabolario dal video</li>
                      <li>Comprensione orale</li>
                      <li>Grammatica e struttura delle frasi</li>
                      <li>Esercizi basati sul contesto</li>
                    </ul>
                  </div>

                  <div className="text-sm font-medium mb-2">Scegli il livello di difficoltà:</div>
                  
                  <div className="space-y-3">
                    {['beginner', 'intermediate', 'advanced'].map((level) => {
                      const levelConfig = {
                        beginner: { label: 'Beginner (A1-A2)', desc: '10 esercizi • Vocabolario base', color: 'green' },
                        intermediate: { label: 'Intermediate (B1-B2)', desc: '10 esercizi • Grammatica complessa', color: 'orange' },
                        advanced: { label: 'Advanced (C1-C2)', desc: '10 esercizi • Concetti astratti', color: 'red' }
                      }[level]!;
                      
                      const isLevelGenerating = isGenerating && generatingLevel === level;
                      const isLevelRegenerating = isRegenerating && regeneratingLevel === level;
                      const isDisabled = isGenerating || isRegenerating;
                      
                      return (
                        <div key={level} className="flex gap-2">
                          <Button 
                            className={`flex-1 justify-start h-auto p-3 bg-${levelConfig.color}-500/10 border-${levelConfig.color}-500/30 hover:bg-${levelConfig.color}-500/20 text-foreground`}
                            variant="outline"
                            onClick={() => handleStartExercises(level)}
                            disabled={isDisabled}
                          >
                            {isLevelGenerating ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generando...</span>
                              </div>
                            ) : (
                              <div className="text-left">
                                <div className="font-medium">{levelConfig.label}</div>
                                <div className="text-xs text-muted-foreground">{levelConfig.desc}</div>
                              </div>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-auto w-10 shrink-0"
                            onClick={() => handleRegenerateExercises(level)}
                            disabled={isDisabled}
                            title="Rigenera esercizi"
                          >
                            {isLevelRegenerating ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      );
                    })}
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
