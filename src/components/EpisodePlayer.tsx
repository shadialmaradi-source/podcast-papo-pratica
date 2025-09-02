import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  FileText, 
  Clock,
  BookOpen,
  Target
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
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const levels = [
    { code: "A1", name: "Beginner (A1)", color: "bg-green-500" },
    { code: "A2", name: "Elementary (A2)", color: "bg-green-600" },
    { code: "B1", name: "Intermediate (B1)", color: "bg-warning" },
    { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-warning" },
    { code: "C1", name: "Advanced (C1)", color: "bg-destructive" },
    { code: "C2", name: "Proficiency (C2)", color: "bg-destructive" },
  ];

  // Extract Spotify episode ID from URL or use a default one
  const getSpotifyEpisodeId = (episode: PodcastEpisode): string => {
    // Try to extract from episode URL if it contains Spotify info
    if (episode.episode_url?.includes('spotify.com/episode/')) {
      return episode.episode_url.split('episode/')[1].split('?')[0];
    }
    
    // Use different default episodes based on language for demo
    const defaultEpisodes = {
      'portuguese': '4rOoJ6Egrf8K2IrywzwOMk', // Real Portuguese learning podcast
      'spanish': '6kAsbP8pxwaU2kPibKTuHE',    // Real Spanish learning podcast  
      'french': '0VXyq8pO9sFxufyAZO6fZ4',     // Real French learning podcast
      'german': '1Je4ccKOqRir4FTUE8nOhy',     // Real German learning podcast
      'english': '5As50p9S6y1h5Y1E8JLZmc'    // Real English learning podcast
    };
    
    return defaultEpisodes[episode.podcast_source?.language as keyof typeof defaultEpisodes] || defaultEpisodes.english;
  };

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

  const formatTimeListened = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const handleStartExercises = (level: string) => {
    setSelectedLevel(level);
    onStartExercises(level);
  };

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

      {/* Audio Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Audio Player
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Spotify Embed Player */}
          <div className="space-y-4">
            <iframe
              src={`https://open.spotify.com/embed/episode/${getSpotifyEpisodeId(episode)}`}
              width="100%"
              height="352"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="rounded-lg"
            />
          </div>

          {/* Listening Time Tracker */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Listening Time: {formatTimeListened(timeListened)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? "Pause Timer" : "Start Timer"}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
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
                    {getMockTranscript(episode.title).split('\n').map((paragraph, index) => (
                      <p key={index} className="text-muted-foreground">
                        {paragraph.trim()}
                      </p>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-primary to-primary-light">
                  <BookOpen className="h-4 w-4" />
                  Start Exercises
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Choose Your Level
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Select your current language level to get appropriate exercises:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {levels.map((level) => (
                      <motion.div
                        key={level.code}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-auto p-4 flex flex-col gap-2"
                          onClick={() => handleStartExercises(level.code)}
                        >
                          <Badge className={`${level.color} text-white`}>
                            {level.code}
                          </Badge>
                          <span className="text-sm font-medium">
                            {level.name}
                          </span>
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Exercise Prompt after 15 minutes */}
          {showExercisePrompt && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-warning/10 to-accent/10 border border-warning/20 rounded-lg p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-warning-foreground">
                    Great listening! Time for exercises? 🎯
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    You've been listening for 15 minutes. Test your comprehension!
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExercisePrompt(false)}
                  >
                    Later
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-warning hover:bg-warning/90">
                        Start Now
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Choose Your Level</DialogTitle>
                      </DialogHeader>
                      <div className="grid grid-cols-2 gap-3">
                        {levels.map((level) => (
                          <Button
                            key={level.code}
                            variant="outline"
                            className="h-auto p-4 flex flex-col gap-2"
                            onClick={() => handleStartExercises(level.code)}
                          >
                            <Badge className={`${level.color} text-white`}>
                              {level.code}
                            </Badge>
                            <span className="text-sm">{level.name}</span>
                          </Button>
                        ))}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </motion.div>
          )}
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