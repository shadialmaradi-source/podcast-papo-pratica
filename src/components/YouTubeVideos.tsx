import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, 
  Play, 
  FileText, 
  BookOpen,
  Target,
  Youtube,
  AlertCircle,
  CheckCircle,
  Loader2,
  Clock,
  Eye,
  Edit3
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import { getVideoInfo, getVideoTranscript } from "@/services/youtubeService";
import { LevelIntensitySelector } from "./LevelIntensitySelector";

interface YouTubeVideosProps {
  onBack: () => void;
  onStartExercises: (videoId: string, level: string, intensity: string) => void;
}

interface VideoData {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
  embedUrl: string;
  originalUrl: string;
  transcript?: string;
}

// Extract YouTube video ID from various URL formats
const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};


export function YouTubeVideos({ onBack, onStartExercises }: YouTubeVideosProps) {
  const [videoUrl, setVideoUrl] = useState("");
  const [currentVideo, setCurrentVideo] = useState<VideoData | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [urlError, setUrlError] = useState("");
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isLoadingTranscript, setIsLoadingTranscript] = useState(false);
  const [transcriptError, setTranscriptError] = useState("");
  const [manualTranscript, setManualTranscript] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [showLevelSelector, setShowLevelSelector] = useState(false);

  const levels = [
    { code: "A1", name: "Beginner (A1)", color: "bg-green-500", description: "Basic vocabulary and simple sentences" },
    { code: "A2", name: "Elementary (A2)", color: "bg-green-600", description: "Everyday expressions and frequent vocabulary" },
    { code: "B1", name: "Intermediate (B1)", color: "bg-warning", description: "Main points and familiar topics" },
    { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-warning", description: "Complex ideas and abstract topics" },
    { code: "C1", name: "Advanced (C1)", color: "bg-destructive", description: "Implicit meaning and detailed analysis" },
    { code: "C2", name: "Proficiency (C2)", color: "bg-destructive", description: "Nuanced understanding and critical evaluation" },
  ];

  const handleSubmitVideo = async () => {
    setUrlError("");
    setIsLoadingVideo(true);
    
    if (!videoUrl.trim()) {
      setUrlError("Please enter a YouTube video URL");
      setIsLoadingVideo(false);
      return;
    }

    const videoId = extractVideoId(videoUrl.trim());
    
    if (!videoId) {
      setUrlError("Invalid YouTube URL. Please enter a valid YouTube video link.");
      setIsLoadingVideo(false);
      return;
    }

    try {
      // Fetch video information
      const videoInfo = await getVideoInfo(videoId);
      
      // Create video data
      const videoData: VideoData = {
        id: videoId,
        title: videoInfo.title,
        description: videoInfo.description,
        duration: videoInfo.duration,
        thumbnail: videoInfo.thumbnail,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        originalUrl: videoUrl.trim()
      };

      setCurrentVideo(videoData);
      setVideoUrl("");
      
      toast({
        title: "Video Loaded! 🎥",
        description: "Video information has been fetched. You can now view the transcript and generate exercises.",
      });
    } catch (error) {
      setUrlError("Failed to load video information. Please check the URL and try again.");
      console.error('Error loading video:', error);
    } finally {
      setIsLoadingVideo(false);
    }
  };

  const handleLevelSelect = async (level: string, intensity: string) => {
    if (!currentVideo) return;
    
    // Check if transcript is already loaded
    if (!currentVideo.transcript) {
      setIsLoadingTranscript(true);
      setTranscriptError("");
      
      try {
        const transcript = await getVideoTranscript(currentVideo.id);
        setCurrentVideo(prev => prev ? { ...prev, transcript } : null);
        onStartExercises(currentVideo.id, level, intensity);
      } catch (error) {
        setTranscriptError("Failed to load transcript. Please try another video.");
        console.error('Error loading transcript:', error);
        toast({
          title: "Transcript Error",
          description: "Could not load transcript for this video. Please try another video.",
          variant: "destructive"
        });
      } finally {
        setIsLoadingTranscript(false);
      }
    } else {
      onStartExercises(currentVideo.id, level, intensity);
    }
  };

  const handleLoadTranscript = async () => {
    if (!currentVideo || currentVideo.transcript) return;
    
    setIsLoadingTranscript(true);
    setTranscriptError("");
    
    try {
      console.log(`Loading transcript for video: ${currentVideo.id}`);
      const transcript = await getVideoTranscript(currentVideo.id);
      console.log(`Transcript loaded, length: ${transcript.length}`);
      
      setCurrentVideo(prev => prev ? { ...prev, transcript } : null);
      setShowTranscript(true);
      
      toast({
        title: "Transcript Loaded Successfully!",
        description: `${transcript.length} characters loaded`,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to load transcript";
      setTranscriptError(errorMessage);
      console.error('Error loading transcript:', error);
      
      toast({
        title: "Transcript Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoadingTranscript(false);
    }
  };

  const handleManualTranscript = () => {
    if (currentVideo && manualTranscript.trim()) {
      setCurrentVideo(prev => prev ? { ...prev, transcript: manualTranscript } : null);
      setShowManualInput(false);
      setManualTranscript("");
      
      toast({
        title: "Manual Transcript Added!",
        description: "You can now generate exercises with this transcript.",
      });
    }
  };

  const clearVideo = () => {
    setCurrentVideo(null);
    setShowTranscript(false);
    setUrlError("");
    setTranscriptError("");
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Youtube className="h-6 w-6 text-red-500" />
            YouTube Videos
          </h2>
          <p className="text-muted-foreground mt-1">
            Learn with authentic YouTube content
          </p>
        </div>
      </div>

      {/* Video URL Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5" />
            Add YouTube Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Paste YouTube video URL here (e.g., https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setUrlError("");
              }}
              className={urlError ? "border-destructive" : ""}
            />
            <Button onClick={handleSubmitVideo} disabled={!videoUrl.trim() || isLoadingVideo}>
              {isLoadingVideo ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load Video"
              )}
            </Button>
          </div>
          
          {urlError && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              {urlError}
            </div>
          )}
          
          <div className="text-xs text-muted-foreground">
            <p>Supported formats:</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>https://youtu.be/VIDEO_ID</li>
              <li>https://www.youtube.com/embed/VIDEO_ID</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Current Video Section */}
      {currentVideo && (
        <div className="space-y-6">
          {/* Video Player */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Now Playing
              </CardTitle>
              <Button variant="outline" size="sm" onClick={clearVideo}>
                Clear Video
              </Button>
            </CardHeader>
            <CardContent>
              <div className="aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  src={currentVideo.embedUrl}
                  title={currentVideo.title}
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              
              <div className="mt-4 space-y-3">
                <h3 className="font-semibold text-lg">{currentVideo.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {currentVideo.description}
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {currentVideo.duration}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Youtube className="h-3 w-3 mr-1" />
                    ID: {currentVideo.id}
                  </Badge>
                  {currentVideo.transcript && (
                    <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Transcript Available
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 flex-wrap">
            {/* Transcript Button */}
            <Dialog open={showTranscript} onOpenChange={setShowTranscript}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={() => {
                    if (!currentVideo?.transcript) {
                      handleLoadTranscript();
                    } else {
                      setShowTranscript(true);
                    }
                  }}
                  disabled={isLoadingTranscript}
                >
                  {isLoadingTranscript ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading Transcript...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      {currentVideo?.transcript ? "View Transcript" : "Load Transcript"}
                    </>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Video Transcript
                  </DialogTitle>
                </DialogHeader>
                {transcriptError ? (
                  <div className="flex items-center gap-2 text-destructive text-sm p-4 border border-destructive/20 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    {transcriptError}
                  </div>
                ) : currentVideo?.transcript ? (
                  <ScrollArea className="h-[60vh] pr-4">
                    <div className="space-y-4 text-sm leading-relaxed">
                      {currentVideo.transcript.split('\n\n').map((paragraph, index) => (
                        paragraph.trim() && (
                          <p key={index} className="text-muted-foreground">
                            {paragraph.trim()}
                          </p>
                        )
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-center text-muted-foreground">
                    Click "Load Transcript" to fetch the video transcript.
                  </div>
                )}
              </DialogContent>
            </Dialog>

            {/* Manual Transcript Input Button */}
            <Button 
              variant="outline" 
              className="gap-2" 
              onClick={() => setShowManualInput(!showManualInput)}
            >
              <Edit3 className="h-4 w-4" />
              Manual Transcript
            </Button>
            <Button 
              className="gap-2 bg-gradient-to-r from-primary to-primary/80"
              onClick={() => setShowLevelSelector(true)}
            >
              <BookOpen className="h-4 w-4" />
              Generate Exercises
            </Button>
          </div>

          {/* Manual Transcript Input */}
          {showManualInput && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Edit3 className="h-5 w-5" />
                  Manual Transcript Input
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                  <p><strong>How to get a transcript:</strong></p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Go to the YouTube video</li>
                    <li>Click the "..." menu below the video</li>
                    <li>Select "Show transcript"</li>
                    <li>Copy the transcript text and paste it here</li>
                  </ol>
                </div>
                <Textarea
                  placeholder="Paste the video transcript here..."
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  className="min-h-[200px]"
                />
                <div className="flex gap-2">
                  <Button 
                    onClick={handleManualTranscript}
                    disabled={!manualTranscript.trim()}
                  >
                    Use This Transcript
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowManualInput(false);
                      setManualTranscript("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Level and Intensity Selector */}
      <LevelIntensitySelector
        isOpen={showLevelSelector}
        onClose={() => setShowLevelSelector(false)}
        onSelect={handleLevelSelect}
        title="Choose YouTube Exercise Settings"
      />

      {/* Instructions when no video loaded */}
      {!currentVideo && (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Youtube className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="font-semibold text-lg">No Video Loaded</h3>
                <p className="text-muted-foreground">
                  Paste a YouTube video URL above to start learning with authentic content.
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-4 text-sm text-left max-w-md mx-auto">
                <h4 className="font-medium mb-2">How it works:</h4>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Paste any YouTube video URL</li>
                  <li>Watch the video in the embedded player</li>
                  <li>View the transcript for better understanding</li>
                  <li>Practice with level-appropriate exercises</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}