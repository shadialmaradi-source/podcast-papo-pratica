import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Play, Subtitles } from "lucide-react";
import { motion } from "framer-motion";

interface VideoData {
  youtubeId: string;
  startTime: number;
  duration: number;
  suggestedSpeed: number;
}

interface LessonVideoPlayerProps {
  video: VideoData;
  onComplete: () => void;
}

const LessonVideoPlayer = ({ video, onComplete }: LessonVideoPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(video.suggestedSpeed.toString());
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [canContinue, setCanContinue] = useState(false);
  const [progress, setProgress] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send postMessage to YouTube iframe to change playback rate
  const sendPlaybackRate = useCallback((rate: number) => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setPlaybackRate', args: [rate] }),
        '*'
      );
    }
  }, []);

  // Apply speed when it changes
  useEffect(() => {
    if (isPlaying) {
      sendPlaybackRate(parseFloat(speed));
    }
  }, [speed, isPlaying, sendPlaybackRate]);

  // Auto-enable continue after video duration
  useEffect(() => {
    if (isPlaying) {
      const timer = setTimeout(() => {
        setCanContinue(true);
      }, video.duration * 1000);
      
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + (100 / video.duration), 100));
      }, 1000);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [isPlaying, video.duration]);

  // Apply initial speed once iframe loads
  const handleIframeLoad = () => {
    // Small delay to let YouTube player initialize
    setTimeout(() => sendPlaybackRate(parseFloat(speed)), 1500);
  };

  const embedUrl = `https://www.youtube.com/embed/${video.youtubeId}?start=${video.startTime}&end=${video.startTime + video.duration}&autoplay=${isPlaying ? 1 : 0}&cc_load_policy=${showSubtitles ? 1 : 0}&rel=0&modestbranding=1&enablejsapi=1&origin=${window.location.origin}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Watch & Listen
          </h1>
          <p className="text-muted-foreground">
            Focus on understanding the main ideas
          </p>
        </div>

        <Card className="shadow-xl rounded-2xl border-0 overflow-hidden">
          <div className="aspect-video bg-black relative">
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
              <iframe
                ref={iframeRef}
                src={embedUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Lesson Video"
                onLoad={handleIframeLoad}
              />
            )}
          </div>
          
          {/* Progress bar */}
          {isPlaying && (
            <div className="h-1 bg-muted">
              <div 
                className="h-full bg-primary transition-all duration-1000"
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

        <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
          <p className="text-sm text-muted-foreground text-center">
            <span className="text-primary font-medium">Tip:</span> Don't worry if you don't understand everything. Focus on the main ideas!
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: canContinue ? 1 : 0.5 }}
          className="text-center"
        >
          <Button
            onClick={onComplete}
            disabled={!canContinue}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
          >
            Continue to Exercises
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          {!canContinue && isPlaying && (
            <p className="text-sm text-muted-foreground mt-2">
              Watch the video to continue...
            </p>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LessonVideoPlayer;
