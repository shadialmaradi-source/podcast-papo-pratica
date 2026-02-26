import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import TranscriptViewer from "@/components/transcript/TranscriptViewer";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";

interface YouTubeVideoExercisesProps {
  videoId: string;
  source?: string;
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

const YouTubeVideoExercises: React.FC<YouTubeVideoExercisesProps> = ({ videoId, source, onBack, onStartExercises }) => {
  const { isPremium } = useSubscription();
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingLevel, setGeneratingLevel] = useState<string | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const curatedAutoStarted = useRef(false);

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  // Auto-start beginner exercises for curated path
  useEffect(() => {
    if (source === 'curated' && videoData && !curatedAutoStarted.current && !isGenerating) {
      curatedAutoStarted.current = true;
      handleStartExercises('beginner');
    }
  }, [source, videoData]);

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

      // Fetch transcript for the TranscriptViewer
      const { data: transcriptData } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', data.id)
        .single();
      
      if (transcriptData?.transcript) {
        setTranscript(transcriptData.transcript);
      }
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

  const handleSeekVideo = useCallback((timeSeconds: number) => {
    // Note: YouTube iframe API requires postMessage for seek
    // For a basic implementation, we can append ?start= but that requires reload
    // Full implementation would use YouTube IFrame Player API
    if (iframeRef.current && videoData) {
      const newSrc = `https://www.youtube.com/embed/${videoData.video_id}?start=${Math.floor(timeSeconds)}&autoplay=1`;
      iframeRef.current.src = newSrc;
    }
  }, [videoData]);

  const handleStartExercises = async (level: string) => {
    if (!videoData) return;
    
    setIsGenerating(true);
    setGeneratingLevel(level);
    
    const dbLevel = level.toLowerCase();
    
    try {
      // Always delete existing exercises and regenerate fresh ones
      console.log(`[YouTubeVideoExercises] Deleting existing exercises for ${dbLevel}...`);
      await supabase
        .from('youtube_exercises')
        .delete()
        .eq('video_id', videoData.id)
        .eq('difficulty', dbLevel);

      // Fetch transcript from DB
      const { data: transcriptData, error: transcriptError } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', videoData.id)
        .single();

      if (transcriptError || !transcriptData?.transcript) {
        console.error('[YouTubeVideoExercises] No transcript found:', transcriptError);
        toast({ 
          title: "Error", 
          description: "No transcript available for this video",
          variant: "destructive"
        });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      console.log(`[YouTubeVideoExercises] Transcript found, generating exercises...`);

      // Resolve native language for translation hints
      let userNativeLanguage = '';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('user_id', user.id)
          .single();
        if (profile?.native_language) {
          userNativeLanguage = profile.native_language;
        }
      }
      if (!userNativeLanguage) {
        const stored = localStorage.getItem('onboarding_native_language');
        if (stored) userNativeLanguage = stored;
      }
      if (!userNativeLanguage) {
        // Detect from browser language
        const browserLang = navigator.language.split('-')[0].toLowerCase();
        const langMap: Record<string, string> = { en: 'english', it: 'italian', es: 'spanish', pt: 'portuguese', fr: 'french' };
        userNativeLanguage = langMap[browserLang] || 'english';
      }
      // Guard: if native language matches video language, pick a useful fallback
      const videoLang = (videoData.language || 'italian').toLowerCase();
      if (userNativeLanguage.toLowerCase() === videoLang) {
        userNativeLanguage = videoLang === 'english' ? 'italian' : 'english';
      }

      // Generate exercises via edge function
      const { data, error } = await supabase.functions.invoke('generate-level-exercises', {
        body: { 
          videoId: videoData.id, 
          level: dbLevel, 
          transcript: transcriptData.transcript,
          language: videoData.language || 'italian',
          nativeLanguage: userNativeLanguage,
          source: source || undefined
        }
      });

      if (error) {
        console.error('[YouTubeVideoExercises] Edge function error:', error);
        toast({ 
          title: "Generation error", 
          description: error.message || "Unable to generate exercises",
          variant: "destructive"
        });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      if (data?.error) {
        console.error('[YouTubeVideoExercises] Generation error:', data.error);
        toast({ 
          title: "Generation error", 
          description: data.error,
          variant: "destructive"
        });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      console.log(`[YouTubeVideoExercises] Generation successful:`, data);
      toast({
        title: "Exercises generated! 🎯",
        description: `${data?.count || 10} exercises created for ${level} level`,
      });

      setIsGenerating(false);
      setGeneratingLevel(null);
      onStartExercises(level);
      
    } catch (err) {
      console.error('[YouTubeVideoExercises] Unexpected error:', err);
      toast({ 
        title: "Error", 
        description: "An unexpected error occurred",
        variant: "destructive"
      });
      setIsGenerating(false);
      setGeneratingLevel(null);
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
                    ref={iframeRef}
                    width="100%"
                    height="100%"
                    src={`https://www.youtube.com/embed/${videoData.video_id}?enablejsapi=1`}
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

            {/* Transcript Viewer - Premium Feature */}
            {transcript && (
              <TranscriptViewer
                videoId={videoData.id}
                transcript={transcript}
                videoTitle={videoData.title}
                language={videoData.language || 'english'}
                isPremium={isPremium}
                currentTime={currentVideoTime}
                onSeek={handleSeekVideo}
                onUpgradeClick={() => setShowUpgradePrompt(true)}
              />
            )}
          </div>

          {/* Exercise Selection Panel */}
          <div className="lg:col-span-1">
            {source === 'curated' ? (
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Beginner Exercises</CardTitle>
                  <CardDescription>
                    Preparing your A1 exercises...
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                  <p className="text-sm text-muted-foreground">Generating exercises from the video...</p>
                </CardContent>
              </Card>
            ) : (
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
                      <p className="font-medium">What you'll practice:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Video vocabulary</li>
                        <li>Listening comprehension</li>
                        <li>Grammar and sentence structure</li>
                        <li>Context-based exercises</li>
                      </ul>
                    </div>

                    <div className="text-sm font-medium mb-2">Choose difficulty level:</div>
                    
                    <div className="space-y-3">
                      {['beginner', 'intermediate', 'advanced'].map((level) => {
                        const levelConfig = {
                          beginner: { label: 'Beginner (A1-A2)', desc: '10 exercises • Basic vocabulary', color: 'green' },
                          intermediate: { label: 'Intermediate (B1-B2)', desc: '10 exercises • Complex grammar', color: 'orange' },
                          advanced: { label: 'Advanced (C1-C2)', desc: '10 exercises • Abstract concepts', color: 'red' }
                        }[level]!;
                        
                        const isLevelGenerating = isGenerating && generatingLevel === level;
                        
                        return (
                          <Button 
                            key={level}
                            className={`w-full justify-start h-auto p-3 bg-${levelConfig.color}-500/10 border-${levelConfig.color}-500/30 hover:bg-${levelConfig.color}-500/20 text-foreground`}
                            variant="outline"
                            onClick={() => handleStartExercises(level)}
                            disabled={isGenerating}
                          >
                          {isLevelGenerating ? (
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Generating...</span>
                              </div>
                            ) : (
                              <div className="text-left">
                                <div className="font-medium">{levelConfig.label}</div>
                                <div className="text-xs text-muted-foreground">{levelConfig.desc}</div>
                              </div>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Unlock Interactive Transcripts"
        description="Create flashcards directly from video transcripts as you watch. Highlight any word or phrase to save it instantly."
      />
    </div>
  );
};

export default YouTubeVideoExercises;
