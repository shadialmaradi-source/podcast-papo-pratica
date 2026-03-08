import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import TranscriptViewer from "@/components/transcript/TranscriptViewer";
import TranscriptTutorial, { type TutorialStep } from "@/components/transcript/TranscriptTutorial";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useStudentTour } from "@/hooks/useStudentTour";

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

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

const mapDifficultyLevel = (level: string): string => {
  switch (level?.toUpperCase()) {
    case 'A1': case 'A2': return 'Beginner';
    case 'B1': case 'B2': return 'Intermediate';
    case 'C1': case 'C2': return 'Advanced';
    case 'BEGINNER': return 'Beginner';
    case 'INTERMEDIATE': return 'Intermediate';
    case 'ADVANCED': return 'Advanced';
    default: return level || 'Unknown';
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
  const [playerFailed, setPlayerFailed] = useState(false);

  // YouTube IFrame API
  const playerContainerId = `yt-player-${videoId}`;
  const playerRef = useRef<any>(null);
  const playerReadyRef = useRef(false);
  const timePollingRef = useRef<NodeJS.Timeout | null>(null);

  // Unified tour integration
  const { phase: tourPhase, advancePhase: advanceTourPhase } = useStudentTour();
  
  // Tutorial state — activate if tour phase is 'transcript' OR legacy flag absent
  const isTutorialCompleted = localStorage.getItem('transcript_tutorial_completed') === 'true';
  const shouldRunTutorial = tourPhase === 'transcript' || !isTutorialCompleted;
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(shouldRunTutorial ? 'completed' : 'completed');
  const [tutorialTriggered, setTutorialTriggered] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const tutorialActive = tutorialStep !== 'completed';

  useEffect(() => {
    loadVideoData();
  }, [videoId]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!videoData) return;

    let destroyed = false;
    playerReadyRef.current = false;
    setPlayerFailed(false);

    const createPlayer = () => {
      if (destroyed || playerRef.current) return;
      const el = document.getElementById(playerContainerId);
      if (!el) return;

      try {
        playerRef.current = new window.YT.Player(playerContainerId, {
          videoId: videoData.video_id,
          playerVars: {
            enablejsapi: 1,
            origin: window.location.origin,
            rel: 0,
          },
          events: {
            onReady: () => {
              playerReadyRef.current = true;
              onPlayerReady();
            },
            onStateChange: onPlayerStateChange,
          },
        });
      } catch (e) {
        console.error('YT.Player creation failed:', e);
        if (!destroyed) setPlayerFailed(true);
      }
    };

    const loadAPI = () => {
      if (window.YT && window.YT.Player) {
        // API already loaded — delay to ensure DOM element exists
        requestAnimationFrame(() => {
          if (!destroyed) createPlayer();
        });
        return;
      }

      // Load the API script
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }

      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        if (!destroyed) createPlayer();
      };
    };

    loadAPI();

    // Fallback: if player hasn't initialized after 4s, show iframe fallback
    const fallbackTimeout = setTimeout(() => {
      if (!playerReadyRef.current && !destroyed) {
        console.warn('YT player init timeout, switching to iframe fallback');
        setPlayerFailed(true);
      }
    }, 4000);

    return () => {
      destroyed = true;
      clearTimeout(fallbackTimeout);
      if (timePollingRef.current) clearInterval(timePollingRef.current);
      if (playerRef.current?.destroy) {
        try { playerRef.current.destroy(); } catch {}
      }
      playerRef.current = null;
    };
  }, [videoData]);

  const onPlayerReady = () => {
    // Start polling current time
    timePollingRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        const time = playerRef.current.getCurrentTime();
        setCurrentVideoTime(time);

        // Tutorial trigger: pause at ~20s if tutorial not completed
        if (
          shouldRunTutorial &&
          !tutorialTriggered &&
          time >= 20 &&
          transcript
        ) {
          playerRef.current.pauseVideo();
          setTutorialTriggered(true);
          setTutorialStep('video-pause');
        }
      }
    }, 500);
  };

  const onPlayerStateChange = () => {
    // No-op for now; polling handles time tracking
  };

  const handleSeekVideo = useCallback((timeSeconds: number) => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(timeSeconds, true);
    }
  }, []);

  // Tutorial handlers
  const handleTutorialAdvance = useCallback(() => {
    setTutorialStep((prev) => {
      switch (prev) {
        case 'video-pause':
          // Scroll to transcript
          setTimeout(() => {
            transcriptRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 100);
          return 'highlight-word';
        case 'highlight-word':
          return 'force-explore';
        case 'force-explore':
          return 'explorer-open';
        case 'explorer-open':
          return 'save-from-explorer';
        case 'save-from-explorer':
          return 'flashcard-modal';
        case 'flashcard-modal':
          return 'resume-video';
        case 'resume-video':
          return 'completed';
        default:
          return 'completed';
      }
    });
  }, []);

  const handleTutorialSkip = useCallback(() => {
    setTutorialStep('completed');
    localStorage.setItem('transcript_tutorial_completed', 'true');
    // Resume video
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  }, []);

  const handleTutorialComplete = useCallback(() => {
    setTutorialStep('completed');
    localStorage.setItem('transcript_tutorial_completed', 'true');
    // Resume video
    if (playerRef.current?.playVideo) {
      playerRef.current.playVideo();
    }
  }, []);

  // Callbacks from TranscriptViewer during tutorial
  const handleTutorialExplorerOpened = useCallback(() => {
    if (tutorialStep === 'highlight-word' || tutorialStep === 'force-explore') {
      setTutorialStep('explorer-open');
    }
  }, [tutorialStep]);

  const handleTutorialExploreComplete = useCallback(() => {
    if (tutorialStep === 'explorer-open') {
      setTutorialStep('save-from-explorer');
    }
  }, [tutorialStep]);

  const handleTutorialFlashcardSaved = useCallback(() => {
    if (tutorialStep === 'save-from-explorer' || tutorialStep === 'flashcard-modal') {
      setTutorialStep('resume-video');
    }
  }, [tutorialStep]);

  const loadVideoData = async () => {
    try {
      setIsLoading(true);
      
      let { data, error } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

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
        toast({ title: "Error", description: "Video not found", variant: "destructive" });
        return;
      }
      
      setVideoData(data);

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
      toast({ title: "Error", description: "Failed to load video data", variant: "destructive" });
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
      await supabase
        .from('youtube_exercises')
        .delete()
        .eq('video_id', videoData.id)
        .eq('difficulty', dbLevel);

      const { data: transcriptData, error: transcriptError } = await supabase
        .from('youtube_transcripts')
        .select('transcript')
        .eq('video_id', videoData.id)
        .single();

      if (transcriptError || !transcriptData?.transcript) {
        toast({ title: "Error", description: "No transcript available for this video", variant: "destructive" });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      let userNativeLanguage = '';
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('native_language')
          .eq('user_id', user.id)
          .single();
        if (profile?.native_language) userNativeLanguage = profile.native_language;
      }
      if (!userNativeLanguage) {
        const stored = localStorage.getItem('onboarding_native_language');
        if (stored) userNativeLanguage = stored;
      }
      if (!userNativeLanguage) {
        const browserLang = navigator.language.split('-')[0].toLowerCase();
        const langMap: Record<string, string> = { en: 'english', it: 'italian', es: 'spanish', pt: 'portuguese', fr: 'french' };
        userNativeLanguage = langMap[browserLang] || 'english';
      }
      const videoLang = (videoData.language || 'italian').toLowerCase();
      if (userNativeLanguage.toLowerCase() === videoLang) {
        userNativeLanguage = videoLang === 'english' ? 'italian' : 'english';
      }

      const { data, error } = await supabase.functions.invoke('generate-level-exercises', {
        body: { 
          videoId: videoData.id, level: dbLevel, transcript: transcriptData.transcript,
          language: videoData.language || 'italian', nativeLanguage: userNativeLanguage,
          source: source || undefined
        }
      });

      if (error) {
        toast({ title: "Generation error", description: error.message || "Unable to generate exercises", variant: "destructive" });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      if (data?.error) {
        toast({ title: "Generation error", description: data.error, variant: "destructive" });
        setIsGenerating(false);
        setGeneratingLevel(null);
        return;
      }

      toast({ title: "Exercises generated! 🎯", description: `${data?.count || 10} exercises created for ${level} level` });
      setIsGenerating(false);
      setGeneratingLevel(null);
      onStartExercises(level);
      
    } catch (err) {
      console.error('[YouTubeVideoExercises] Unexpected error:', err);
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
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
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-3 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Library
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Video Player Section */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="aspect-video w-full">
                  {playerFailed ? (
                    <iframe
                      src={`https://www.youtube.com/embed/${videoData.video_id}?rel=0&enablejsapi=0`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title={videoData.title}
                    />
                  ) : (
                    <div id={playerContainerId} className="w-full h-full" />
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl md:text-2xl mb-2">{videoData.title}</CardTitle>
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

            {/* Transcript Viewer */}
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
                tutorialActive={tutorialActive}
                tutorialStep={tutorialStep}
                onTutorialExploreComplete={handleTutorialExploreComplete}
                onTutorialFlashcardSaved={handleTutorialFlashcardSaved}
                onTutorialExplorerOpened={handleTutorialExplorerOpened}
                transcriptRef={transcriptRef}
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
                    Watch the video and read the transcript, then practice what you learned!
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground space-y-2">
                    <p className="font-medium">What you'll practice:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Video vocabulary</li>
                      <li>Listening comprehension</li>
                      <li>Grammar and sentence structure</li>
                    </ul>
                  </div>
                  <Button
                    variant="learning"
                    size="lg"
                    className="w-full"
                    onClick={() => handleStartExercises('beginner')}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                    ) : (
                      'Practice with Exercises'
                    )}
                  </Button>
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

      {/* Tutorial overlay */}
      {tutorialActive && (
        <TranscriptTutorial
          step={tutorialStep}
          onAdvance={handleTutorialAdvance}
          onSkip={handleTutorialSkip}
          onComplete={handleTutorialComplete}
        />
      )}

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
