import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, ArrowRight, Play, Subtitles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface VideoData {
  youtubeId: string;
  startTime: number;
  duration: number;
  suggestedSpeed: number;
  isShort?: boolean;
}

interface LessonVideoPlayerProps {
  video: VideoData;
  onComplete: () => void;
}

// Extend window for YouTube IFrame API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

// Load YouTube IFrame API script once
const loadYouTubeAPI = (): Promise<void> => {
  return new Promise((resolve) => {
    if (window.YT?.Player) {
      resolve();
      return;
    }
    const existing = document.getElementById('yt-iframe-api');
    if (!existing) {
      const script = document.createElement('script');
      script.id = 'yt-iframe-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
  });
};

const LessonVideoPlayer = ({ video, onComplete }: LessonVideoPlayerProps) => {
  const navigate = useNavigate();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(video.suggestedSpeed.toString());
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [canContinue, setCanContinue] = useState(false);
  const [progress, setProgress] = useState(0);
  const playerRef = useRef<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerIdRef = useRef(`yt-player-${Date.now()}`);

  // Apply speed changes to player
  useEffect(() => {
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(parseFloat(speed));
    }
  }, [speed]);

  // Initialize YT.Player when user clicks play
  useEffect(() => {
    if (!isPlaying) return;

    let destroyed = false;

    const initPlayer = async () => {
      await loadYouTubeAPI();
      if (destroyed) return;

      playerRef.current = new window.YT.Player(containerIdRef.current, {
        videoId: video.youtubeId,
        playerVars: {
          start: video.startTime,
          ...(video.isShort ? {} : { end: video.startTime + video.duration }),
          autoplay: 1,
          cc_load_policy: showSubtitles ? 1 : 0,
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setPlaybackRate(parseFloat(speed));
          },
          onStateChange: (event: any) => {
            // 0 = ENDED
            if (event.data === 0) {
              setCanContinue(true);
              setProgress(100);
            }
          },
          onError: () => {
            // If video fails to load (e.g. Shorts), unlock continue
            setCanContinue(true);
            setProgress(100);
          },
        },
      });

      // Poll getCurrentTime every 500ms for progress
      pollRef.current = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime || !p?.getDuration) return;
        const current = p.getCurrentTime();
        const duration = p.getDuration();
        if (duration > 0) {
          const startOffset = video.startTime;
          const effectiveDuration = Math.min(video.duration, duration - startOffset);
          const elapsed = current - startOffset;
          const pct = Math.min(Math.max((elapsed / effectiveDuration) * 100, 0), 100);
          setProgress(prev => Math.max(prev, pct));
        }
      }, 500);
    };

    initPlayer();

    // 30s fallback
    const fallback = setTimeout(() => {
      setCanContinue(true);
      setProgress(100);
    }, 30000);

    return () => {
      destroyed = true;
      clearTimeout(fallback);
      if (pollRef.current) clearInterval(pollRef.current);
      if (playerRef.current?.destroy) playerRef.current.destroy();
      playerRef.current = null;
    };
  }, [isPlaying]); // intentionally minimal deps — player created once

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col"
    >
      <div className="flex-1 overflow-auto p-3 md:p-8">
        <div className="max-w-3xl mx-auto space-y-3 md:space-y-6">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/onboarding')}
            className="gap-1 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Change level
          </Button>
          <div className="text-center space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Watch & Listen
            </h1>
            <p className="text-muted-foreground">
              Focus on understanding the main ideas
            </p>
          </div>
        </div>

        <Card className="shadow-xl rounded-2xl border-0 overflow-hidden">
          <div className={`${video.isShort ? 'aspect-[9/16] max-h-[70vh] mx-auto max-w-[400px]' : 'aspect-video'} bg-black relative`}>
            {!isPlaying ? (
              <div 
                className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
                onClick={() => setIsPlaying(true)}
              >
                <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                  <Play className="w-10 h-10 text-primary-foreground ml-1" />
                </div>
              </div>
            ) : (
              <div id={containerIdRef.current} className="w-full h-full" />
            )}
          </div>
          
          {/* Progress bar */}
          {isPlaying && (
            <div className="h-1 bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          <CardContent className="p-4 md:p-6 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Speed:</span>
                  <Select value={speed} onValueChange={setSpeed}>
                    <SelectTrigger className="w-20 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.5">0.5x</SelectItem>
                      <SelectItem value="0.75">0.75x</SelectItem>
                      <SelectItem value="0.8">0.8x</SelectItem>
                      <SelectItem value="1">1x</SelectItem>
                      <SelectItem value="1.2">1.2x</SelectItem>
                      <SelectItem value="1.5">1.5x</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  variant={showSubtitles ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className="gap-2"
                >
                  <Subtitles className="w-4 h-4" />
                  <span className="hidden sm:inline">Subtitles</span>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                {Math.floor(progress / 100 * video.duration)}s / {video.duration}s
              </div>
            </div>
          </CardContent>
        </Card>

          <div className="bg-primary/5 rounded-xl p-3 md:p-4 border border-primary/20">
            <p className="text-xs md:text-sm text-muted-foreground text-center">
              <span className="text-primary font-medium">Tip:</span> Don't worry if you don't understand everything. Focus on the main ideas!
            </p>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 p-3 md:p-6 bg-background/80 backdrop-blur border-t md:border-0">
        <div className="max-w-3xl mx-auto text-center">
          <Button
            onClick={onComplete}
            disabled={!canContinue}
            size="lg"
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-5 md:py-6 text-base md:text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            Continue to Exercises
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          {!canContinue && isPlaying && (
            <p className="text-xs md:text-sm text-muted-foreground mt-2">
              Watch the video to continue...
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LessonVideoPlayer;
