import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { LevelSelector } from "@/components/library/LevelSelector";
import { FilterBar } from "@/components/library/FilterBar";
import { FeaturedRow } from "@/components/library/FeaturedRow";
import { VideoCard } from "@/components/library/VideoCard";
import { AddVideoCard } from "@/components/library/AddVideoCard";
import { LearningPath } from "@/components/library/LearningPath";
import { LibraryTourTooltip } from "@/components/library/LibraryTourTooltip";
import { AppHeader } from "@/components/AppHeader";
import { QuotaIndicator } from "@/components/subscription/QuotaIndicator";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getUploadQuotaStatus } from "@/services/subscriptionService";
import { trackEvent, trackPageLoad } from "@/lib/analytics";
import { AssignVideoModal } from "@/components/teacher/AssignVideoModal";

interface VideoTopic {
  topic: string;
  is_primary: boolean;
}

interface Video {
  id: string;
  video_id: string;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  topics?: string[];
  duration: number | null;
  difficulty_level: string;
  is_curated: boolean;
  language: string;
  is_short?: boolean;
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { role } = useUserRole();
  const isTeacher = role === "teacher";
  
  // State
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [activeTab, setActiveTab] = useState<'curated' | 'community'>('curated');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState<string>(localStorage.getItem('onboarding_language') || 'english');
  const [curatedVideoIds, setCuratedVideoIds] = useState<Set<string>>(new Set());

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [videoUrl, setVideoUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const [uploadQuota, setUploadQuota] = useState<{
    uploadsUsed: number;
    uploadsLimit: number;
    totalDurationUsed: number;
    totalDurationLimit: number;
    isPremium: boolean;
  } | null>(null);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("");

  // Assign modal state
  const [assignVideo, setAssignVideo] = useState<{ id: string; title: string; videoId: string } | null>(null);

  // Tour state (1-4 steps, null = done)
  const [tourStep, setTourStep] = useState<number | null>(() => {
    return localStorage.getItem('library_tour_completed') ? null : 1;
  });

  const advanceTour = useCallback(() => {
    setTourStep((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      if (next === 3) {
        // Auto-switch to community tab for step 3
        setActiveTab('community');
      }
      if (next > 4) {
        localStorage.setItem('library_tour_completed', 'true');
        return null;
      }
      return next;
    });
  }, []);

  // Fetch curated video IDs (linked from week_videos)
  useEffect(() => {
    trackPageLoad("library");
    supabase.from("week_videos").select("linked_video_id")
      .not("linked_video_id", "is", null)
      .then(({ data }) => {
        setCuratedVideoIds(new Set(data?.map(r => r.linked_video_id).filter(Boolean) as string[] || []));
      });
  }, []);

  // Fetch user's language preference
  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("selected_language")
        .eq("user_id", user.id)
        .single();
      
      if (data?.selected_language) {
        setUserLanguage(data.selected_language);
      }
    };

    fetchUserLanguage();
  }, [user]);

  // Fetch videos with their topics
  useEffect(() => {
    const fetchVideos = async () => {
      setLoading(true);
      
      try {
        // Fetch videos with their topics from the junction table
        const { data, error } = await supabase
          .from("youtube_videos")
          .select(`
            *,
            video_topics(topic, is_primary)
          `)
          .eq("status", "completed")
          .eq("language", userLanguage);

        if (error) throw error;
        
        // Transform data to include topics array
        const videosWithTopics = (data || []).map(video => ({
          ...video,
          topics: video.video_topics?.map((vt: VideoTopic) => vt.topic) || []
        }));
        
        setVideos(videosWithTopics);
      } catch (error) {
        console.error("Error fetching videos:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [userLanguage]);

  // Fetch upload quota
  useEffect(() => {
    const fetchQuota = async () => {
      if (!user) return;
      try {
        const quota = await getUploadQuotaStatus(user.id);
        setUploadQuota(quota);
      } catch (error) {
        console.error("Error fetching upload quota:", error);
      }
    };
    fetchQuota();
  }, [user]);

  const handleImportVideo = async () => {
    if (!videoUrl.trim()) {
      toast.error("Please enter a video URL");
      return;
    }
    if (!user) {
      toast.error("Please log in to import videos");
      return;
    }
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        toast.error("Please log in to import videos");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("selected_language")
        .eq("user_id", user.id)
        .single();

      const response = await fetch(
        `https://fezpzihnvblzjrdzgioq.supabase.co/functions/v1/process-youtube-video`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            videoUrl: videoUrl,
            language: profile?.selected_language || userLanguage
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        const errorMessage = data.error || "Failed to import video";
        if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
          setUpgradeReason(errorMessage);
          setShowUpgradePrompt(true);
          return;
        }
        toast.error(errorMessage);
        return;
      }

      const videoDbId = data?.video?.id;
      if (videoDbId) {
        setVideoUrl("");
        setImportDialogOpen(false);
        toast.success("Video ready! Starting your lesson...");
        const quota = await getUploadQuotaStatus(user.id);
        setUploadQuota(quota);
        navigate(`/lesson/${videoDbId}`);
      } else {
        toast.success("Video added! Check the library when processing completes.");
        setVideoUrl("");
        setImportDialogOpen(false);
        const quota = await getUploadQuotaStatus(user.id);
        setUploadQuota(quota);
      }
    } catch (error: any) {
      console.error("Error importing video:", error);
      toast.error(error?.message || "Failed to import video. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  // Filter videos based on current selections
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      const levelMatch = activeTab === 'curated' ? video.difficulty_level.toLowerCase() === selectedLevel : true;
      const tabMatch = activeTab === 'curated' ? video.is_curated : !video.is_curated;
      if (activeTab === 'community' && curatedVideoIds.has(video.id)) return false;
      let topicMatch = true;
      if (selectedTopic && video.topics) {
        topicMatch = video.topics.some(t => t.toLowerCase() === selectedTopic.toLowerCase());
      }
      let lengthMatch = true;
      if (selectedLength) {
        switch (selectedLength) {
          case 'short': lengthMatch = video.is_short === true; break;
          case 'long': lengthMatch = video.is_short !== true; break;
        }
      }
      return levelMatch && tabMatch && topicMatch && lengthMatch;
    });
  }, [videos, selectedLevel, activeTab, selectedTopic, selectedLength, curatedVideoIds]);

  const featuredVideos = filteredVideos.slice(0, 6);
  const remainingVideos = filteredVideos.slice(6);

  const handleVideoClick = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    if (video) {
      navigate(`/lesson/${video.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader title="Video Library" showBackButton backTo="/app" />

      {/* Level Selector — only on Learning Path */}
      {activeTab === 'curated' && (
        <div className="sticky top-[57px] z-40 bg-background border-b">
          <div className="container mx-auto px-4">
            <LevelSelector
              selectedLevel={selectedLevel}
              onLevelChange={setSelectedLevel}
            />
          </div>
        </div>
      )}

      {/* Tabs and Filters */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => { const tab = v as 'curated' | 'community'; trackEvent('library_tab_switched', { tab }); setActiveTab(tab); }}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <div className="relative">
              <TabsTrigger value="curated" className="w-full">Learning Path</TabsTrigger>
              {tourStep === 1 && (
                <LibraryTourTooltip
                  message="This is your Learning Path — a structured series of lessons curated by level to guide your progress step by step."
                  onClose={advanceTour}
                />
              )}
            </div>
            <div className="relative">
              <TabsTrigger value="community" className="w-full">Community</TabsTrigger>
              {tourStep === 2 && (
                <LibraryTourTooltip
                  message="Explore videos added by other learners, or add your own!"
                  onClose={advanceTour}
                />
              )}
            </div>
          </TabsList>
        </Tabs>

        {activeTab === 'community' && (
          <FilterBar
            selectedTopic={selectedTopic}
            selectedLength={selectedLength}
            onTopicChange={setSelectedTopic}
            onLengthChange={setSelectedLength}
          />
        )}
      </div>

      {/* Content */}
      <main className="container mx-auto px-4 pb-8">
        {activeTab === 'curated' ? (
          <LearningPath level={selectedLevel} language={userLanguage} />
        ) : (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Always show Add Video card even when no videos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div className="relative">
                    <AddVideoCard onClick={() => setImportDialogOpen(true)} />
                    {tourStep === 3 && (
                      <LibraryTourTooltip
                        message="Paste any YouTube link to create a personalized lesson with exercises and flashcards."
                        onClose={advanceTour}
                      />
                    )}
                  </div>
                </div>
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No videos found for this selection.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters or add your own video above.
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Add Video CTA + Featured Row */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-3">Featured</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="relative">
                      <AddVideoCard onClick={() => setImportDialogOpen(true)} />
                      {tourStep === 3 && (
                        <LibraryTourTooltip
                          message="Paste any YouTube link to create a personalized lesson with exercises and flashcards."
                          onClose={advanceTour}
                        />
                      )}
                    </div>
                    {featuredVideos.map((video, index) => (
                      <div key={video.id} className="relative">
                        <VideoCard
                          id={video.id}
                          title={video.title}
                          thumbnailUrl={video.thumbnail_url}
                          topics={video.topics}
                          duration={video.duration}
                          difficultyLevel={video.difficulty_level}
                          isCurated={video.is_curated}
                          onClick={() => handleVideoClick(video.id)}
                          onAssign={isTeacher ? () => setAssignVideo({ id: video.id, title: video.title, videoId: video.video_id }) : undefined}
                        />
                        {index === 0 && tourStep === 4 && (
                          <LibraryTourTooltip
                            message="Tap any video to start a lesson with transcript, exercises, and speaking practice."
                            onClose={advanceTour}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {remainingVideos.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-foreground mb-3">
                      All Videos
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {remainingVideos.map((video) => (
                        <VideoCard
                          key={video.id}
                          id={video.id}
                          title={video.title}
                          thumbnailUrl={video.thumbnail_url}
                          topics={video.topics}
                          duration={video.duration}
                          difficultyLevel={video.difficulty_level}
                          isCurated={video.is_curated}
                          onClick={() => handleVideoClick(video.id)}
                          onAssign={isTeacher ? () => setAssignVideo({ id: video.id, title: video.title, videoId: video.video_id }) : undefined}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </>
        )}
      </main>

      {/* Import Video Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Your Own Video</DialogTitle>
            <DialogDescription>
              Paste a YouTube video URL to create personalized lessons
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {uploadQuota && (
              <QuotaIndicator
                used={uploadQuota.uploadsUsed}
                limit={uploadQuota.uploadsLimit}
                label="uploads"
                showUpgradeHint={!uploadQuota.isPremium}
              />
            )}
            <div className="space-y-2">
              <Label htmlFor="library-video-url">Video URL</Label>
              <Input
                id="library-video-url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
              {!uploadQuota?.isPremium && (
                <p className="text-xs text-muted-foreground">
                  Max video length: 10 minutes
                </p>
              )}
            </div>
            <Button
              className="w-full"
              onClick={handleImportVideo}
              disabled={importing || (uploadQuota?.uploadsUsed ?? 0) >= (uploadQuota?.uploadsLimit ?? 2)}
            >
              {importing ? "Processing..." : "Add Video"}
            </Button>
            {!uploadQuota?.isPremium && (
              <div className="text-center pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-2">Want more uploads?</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/premium')}
                  className="text-xs"
                >
                  Upgrade to Premium
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Prompt */}
      <UpgradePrompt
        open={showUpgradePrompt}
        onOpenChange={setShowUpgradePrompt}
        title="Upload Limit Reached"
        description={upgradeReason || "Upgrade to Premium for more video uploads."}
        quotaUsed={uploadQuota?.uploadsUsed}
        quotaLimit={uploadQuota?.uploadsLimit}
      />

      {/* Assign Video Modal (teachers only) */}
      {assignVideo && (
        <AssignVideoModal
          open={!!assignVideo}
          onOpenChange={(o) => !o && setAssignVideo(null)}
          videoTitle={assignVideo.title}
          videoId={assignVideo.videoId}
        />
      )}
    </div>
  );
}
