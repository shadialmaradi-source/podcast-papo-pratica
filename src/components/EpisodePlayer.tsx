import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  FileText, 
  Clock,
  BookOpen,
  Target,
  SkipBack,
  SkipForward
} from "lucide-react";
import { motion } from "framer-motion";
import { PodcastEpisode } from "@/services/podcastService";
import { updateEpisodeProgress } from "@/services/podcastService";
import { toast } from "@/hooks/use-toast";

interface EpisodePlayerProps {
  episode: PodcastEpisode;
  onStartExercises: (level: string) => void;
  onBack: () => void;
}

// Mock transcript for demo
const getMockTranscript = (episodeTitle: string) => {
  return `Welcome to "${episodeTitle}". In today's episode, we're going to explore some fascinating topics that will help you improve your language skills.

The conversation begins with a discussion about daily routines and how they vary across different cultures. We'll hear from speakers who share their morning rituals, work schedules, and evening activities.

Throughout this episode, you'll encounter new vocabulary related to time expressions, daily activities, and cultural differences. Pay attention to the pronunciation and try to identify the key phrases that are repeated.

We'll also touch on the importance of establishing good habits and how they can impact your language learning journey. The speakers will share practical tips for incorporating language practice into your daily routine.

As we progress through the discussion, notice how the speakers use different tenses to talk about regular activities, past experiences, and future plans. This is an excellent opportunity to practice your listening comprehension skills.

Remember to take notes as you listen, and don't worry if you don't understand everything the first time. Language learning is a gradual process, and each listening session helps build your skills.

At the end of this episode, you'll have the opportunity to test your understanding through various exercises designed for your current level. These activities will help reinforce what you've learned and identify areas for improvement.

Thank you for joining us today, and we hope you find this episode both educational and enjoyable. Let's begin our language learning adventure together!`;
};

export function EpisodePlayer({ episode, onStartExercises, onBack }: EpisodePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [timeListened, setTimeListened] = useState(0);
  const [showExercisePrompt, setShowExercisePrompt] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const levels = [
    { code: "A1", name: "Beginner (A1)", color: "bg-green-500" },
    { code: "A2", name: "Elementary (A2)", color: "bg-green-600" },
    { code: "B1", name: "Intermediate (B1)", color: "bg-warning" },
    { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-warning" },
    { code: "C1", name: "Advanced (C1)", color: "bg-destructive" },
    { code: "C2", name: "Proficiency (C2)", color: "bg-destructive" },
  ];

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setTimeListened(prev => {
          const newTime = prev + 1;
          // Show exercise prompt after 15 minutes (900 seconds)
          if (newTime === 900) {
            setShowExercisePrompt(true);
            toast({
              title: "Exercise Time! 🎯",
              description: "You've been listening for 15 minutes. Ready for some exercises?",
            });
          }
          return newTime;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  const formatTimeListened = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Audio element not found');
      return;
    }

    console.log('Audio URL:', audio.src);
    console.log('Audio ready state:', audio.readyState);

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error('Error playing audio:', error);
        toast({
          title: "Audio Error",
          description: "Unable to play audio. Please try again.",
          variant: "destructive"
        });
      }
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = value[0];
    setCurrentTime(value[0]);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = value[0] / 100;
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const handleSpeedChange = (speed: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const rate = parseFloat(speed);
    audio.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const skipForward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.min(audio.currentTime + 15, audio.duration);
  };

  const skipBackward = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    audio.currentTime = Math.max(audio.currentTime - 15, 0);
  };

  const handleStartExercises = (level: string) => {
    setSelectedLevel(level);
    onStartExercises(level);
  };

  // Use audio_url from episode or fallback to a working test audio
  const audioUrl = episode.audio_url || 'https://www.learningcontainer.com/wp-content/uploads/2020/02/Kalimba.mp3';

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{episode.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">
              {episode.podcast_source?.difficulty_level}
            </Badge>
            <Badge variant="secondary">
              {episode.podcast_source?.category}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Listened: {formatTimeListened(timeListened)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Spotify Embed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Listen to Episode
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <iframe 
              data-testid="embed-iframe" 
              style={{borderRadius: "12px"}} 
              src="https://open.spotify.com/embed/episode/2sg5YB59AWkzVEfDy7kbpY?utm_source=generator" 
              width="100%" 
              height="152" 
              frameBorder="0" 
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
              loading="lazy"
            />
          </div>
        </CardContent>
      </Card>

      {/* Exercise Levels Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Practice Exercises
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose your language level to start practicing with this episode
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {levels.map((level) => (
              <motion.div
                key={level.code}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant="outline"
                  className="w-full h-auto p-6 flex flex-col gap-3 hover:shadow-md transition-all"
                  onClick={() => handleStartExercises(level.code)}
                >
                  <Badge className={`${level.color} text-white text-lg px-3 py-1`}>
                    {level.code}
                  </Badge>
                  <div className="text-center">
                    <div className="font-medium text-sm">
                      {level.name.split(' ')[0]}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {level.name.split(' ').slice(1).join(' ')}
                    </div>
                  </div>
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Additional Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  {showTranscript ? "Hide" : "Show"} Transcript
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle>Episode Transcript</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[60vh] pr-4">
                  <div className="space-y-4 text-sm leading-relaxed">
                    {episode.transcript ? 
                      episode.transcript.split('\n').map((paragraph, index) => (
                        <p key={index} className="text-muted-foreground">
                          {paragraph.trim()}
                        </p>
                      )) :
                      getMockTranscript(episode.title).split('\n').map((paragraph, index) => (
                        <p key={index} className="text-muted-foreground">
                          {paragraph.trim()}
                        </p>
                      ))
                    }
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Episode Details */}
      <Card>
        <CardHeader>
          <CardTitle>Episode Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {episode.description || "No description available for this episode."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}