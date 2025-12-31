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
import { supabase } from "@/integrations/supabase/client";

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
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [processingMessage, setProcessingMessage] = useState("");

  const levels = [
    { code: "A1", name: "Beginner (A1)", color: "bg-green-500", description: "Basic vocabulary and simple sentences" },
    { code: "A2", name: "Elementary (A2)", color: "bg-green-600", description: "Everyday expressions and frequent vocabulary" },
    { code: "B1", name: "Intermediate (B1)", color: "bg-warning", description: "Main points and familiar topics" },
    { code: "B2", name: "Upper-Intermediate (B2)", color: "bg-warning", description: "Complex ideas and abstract topics" },
    { code: "C1", name: "Advanced (C1)", color: "bg-destructive", description: "Implicit meaning and detailed analysis" },
    { code: "C2", name: "Proficiency (C2)", color: "bg-destructive", description: "Nuanced understanding and critical evaluation" },
  ];

  // Poll for video processing status
  const pollVideoStatus = async (videoId: string, dbVideoId: string) => {
    setProcessingStatus('processing');
    setProcessingMessage('Extracting transcript and generating exercises...');
    
    const maxAttempts = 30; // 2.5 minutes max
    let attempts = 0;
    
    const poll = async () => {
      attempts++;
      
      const { data: video } = await supabase
        .from('youtube_videos')
        .select('status')
        .eq('id', dbVideoId)
        .single();
      
      if (video?.status === 'completed') {
        setProcessingStatus('completed');
        setProcessingMessage('');
        
        // Get transcript
        const { data: transcriptData } = await supabase
          .from('youtube_transcripts')
          .select('transcript')
          .eq('video_id', dbVideoId)
          .single();
        
        if (transcriptData?.transcript) {
          setCurrentVideo(prev => prev ? { ...prev, transcript: transcriptData.transcript } : null);
        }
        
        toast({
          title: "Video Ready!",
          description: "Transcript extracted and exercises generated. Start learning!",
        });
        return;
      }
      
      if (video?.status === 'failed') {
        setProcessingStatus('failed');
        setProcessingMessage('Transcript extraction failed. This video may not have captions. Try manual input.');
        return;
      }
      
      if (attempts >= maxAttempts) {
        setProcessingStatus('failed');
        setProcessingMessage('Processing timed out. Please try again or use manual transcript input.');
        return;
      }
      
      // Continue polling
      setTimeout(poll, 5000);
    };
    
    poll();
  };

  const handleSubmitVideo = async () => {
    setUrlError("");
    setIsLoadingVideo(true);
    setProcessingStatus('idle');
    setProcessingMessage("");
    
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
      // Check if video already exists in database
      const { data: existingVideo } = await supabase
        .from('youtube_videos')
        .select('*')
        .eq('video_id', videoId)
        .single();

      if (existingVideo && existingVideo.status === 'completed') {
        // Video already processed, use existing data
        const videoData: VideoData = {
          id: videoId,
          title: existingVideo.title,
          description: existingVideo.description || 'YouTube Video',
          duration: existingVideo.duration ? `${Math.floor(existingVideo.duration / 60)}:${existingVideo.duration % 60}` : 'N/A',
          thumbnail: existingVideo.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          originalUrl: videoUrl.trim()
        };

        // Get transcript if available
        const { data: transcriptData } = await supabase
          .from('youtube_transcripts')
          .select('transcript')
          .eq('video_id', existingVideo.id)
          .single();

        if (transcriptData?.transcript) {
          videoData.transcript = transcriptData.transcript;
        }

        setCurrentVideo(videoData);
        setVideoUrl("");
        setProcessingStatus('completed');
        
        toast({
          title: "Video Loaded!",
          description: "Video already exists in our library with pre-generated exercises.",
        });
        return;
      }

      // If video is currently processing, show status
      if (existingVideo && existingVideo.status === 'processing') {
        const videoInfo = await getVideoInfo(videoId);
        setCurrentVideo({
          id: videoId,
          title: videoInfo.title,
          description: videoInfo.description,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          originalUrl: videoUrl.trim()
        });
        setVideoUrl("");
        pollVideoStatus(videoId, existingVideo.id);
        return;
      }

      // If video failed before, allow retry
      if (existingVideo && existingVideo.status === 'failed') {
        const videoInfo = await getVideoInfo(videoId);
        setCurrentVideo({
          id: videoId,
          title: videoInfo.title,
          description: videoInfo.description,
          duration: videoInfo.duration,
          thumbnail: videoInfo.thumbnail,
          embedUrl: `https://www.youtube.com/embed/${videoId}`,
          originalUrl: videoUrl.trim()
        });
        setVideoUrl("");
        setProcessingStatus('failed');
        setProcessingMessage('Previous processing failed. Use manual transcript input or try another video.');
        return;
      }

      // Add new video to the system
      const { data, error } = await supabase.functions.invoke('process-youtube-video', {
        body: {
          videoUrl: videoUrl.trim(),
          language: 'english',
          difficulty: 'beginner'
        }
      });

      if (error) throw error;

      // Fetch video information for immediate display
      const videoInfo = await getVideoInfo(videoId);
      
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
      
      // Start polling for processing status
      if (data?.video?.id) {
        pollVideoStatus(videoId, data.video.id);
      }
      
      toast({
        title: "Video Added!",
        description: "Processing transcript and generating exercises. This may take 1-2 minutes.",
      });
      
    } catch (error: any) {
      const errorMessage = error.message || "Failed to load video information.";
      
      if (errorMessage.includes('captions') || errorMessage.includes('transcript')) {
        setUrlError("This video doesn't have captions. Please try a video with subtitles enabled, or use manual transcript input.");
      } else {
        setUrlError(errorMessage);
      }
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
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="space-y-3 sm:space-y-4">
        <Button variant="outline" size="sm" onClick={onBack} className="w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div>
          <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Youtube className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
            YouTube Videos
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
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
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Paste YouTube video URL here (e.g., https://www.youtube.com/watch?v=...)"
              value={videoUrl}
              onChange={(e) => {
                setVideoUrl(e.target.value);
                setUrlError("");
              }}
              className={`${urlError ? "border-destructive" : ""} flex-1`}
            />
            <Button onClick={handleSubmitVideo} disabled={!videoUrl.trim() || isLoadingVideo} className="w-full sm:w-auto">
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
                  {processingStatus === 'processing' && (
                    <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Processing...
                    </Badge>
                  )}
                  {processingStatus === 'failed' && (
                    <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Processing Failed
                    </Badge>
                  )}
                </div>
                
                {/* Processing Status Message */}
                {processingMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    processingStatus === 'processing' 
                      ? 'bg-yellow-50 text-yellow-800 border border-yellow-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {processingStatus === 'processing' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{processingMessage}</span>
                      </div>
                    )}
                    {processingStatus === 'failed' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          <span>{processingMessage}</span>
                        </div>
                        <p className="text-xs">Tip: Use the "Manual Transcript" button below to paste the transcript yourself.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
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
        level="beginner"
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