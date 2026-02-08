import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LevelSelector } from "@/components/library/LevelSelector";
import { FilterBar } from "@/components/library/FilterBar";
import { FeaturedRow } from "@/components/library/FeaturedRow";
import { VideoCard } from "@/components/library/VideoCard";
import { LearningPath } from "@/components/library/LearningPath";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
}

export default function Library() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [activeTab, setActiveTab] = useState<'curated' | 'community'>('curated');
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedLength, setSelectedLength] = useState<string | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLanguage, setUserLanguage] = useState<string>('english');

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

  // Filter videos based on current selections
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Filter by level
      const levelMatch = video.difficulty_level.toLowerCase() === selectedLevel;
      
      // Filter by curated/community
      const tabMatch = activeTab === 'curated' ? video.is_curated : !video.is_curated;
      
      // Filter by topic (check if video has the selected topic)
      let topicMatch = true;
      if (selectedTopic && video.topics) {
        topicMatch = video.topics.some(t => t.toLowerCase() === selectedTopic.toLowerCase());
      }
      
      // Filter by length
      let lengthMatch = true;
      if (selectedLength && video.duration) {
        const duration = video.duration;
        switch (selectedLength) {
          case '0-60':
            lengthMatch = duration <= 60;
            break;
          case '60-180':
            lengthMatch = duration > 60 && duration <= 180;
            break;
          case '180+':
            lengthMatch = duration > 180;
            break;
        }
      }

      return levelMatch && tabMatch && topicMatch && lengthMatch;
    });
  }, [videos, selectedLevel, activeTab, selectedTopic, selectedLength]);

  // Get featured videos (first 4-6 from filtered)
  const featuredVideos = filteredVideos.slice(0, 6);
  const remainingVideos = filteredVideos.slice(6);

  const handleVideoClick = (videoId: string) => {
    // Find the video to get its database ID
    const video = videos.find(v => v.id === videoId);
    if (video) {
      navigate(`/lesson/${video.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <AppHeader title="Video Library" showBackButton backTo="/app" />

      {/* Level Selector */}
      <div className="sticky top-[57px] z-40 bg-background border-b">
        <div className="container mx-auto px-4">
          <LevelSelector
            selectedLevel={selectedLevel}
            onLevelChange={setSelectedLevel}
          />
        </div>
      </div>

      {/* Tabs and Filters */}
      <div className="container mx-auto px-4 py-4 space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'curated' | 'community')}>
          <TabsList className="grid w-full max-w-xs grid-cols-2">
            <TabsTrigger value="curated">Curated</TabsTrigger>
            <TabsTrigger value="community">Community</TabsTrigger>
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
                className="text-center py-12"
              >
                <p className="text-muted-foreground">
                  No videos found for this selection.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Try adjusting your filters or check back later.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {featuredVideos.length > 0 && (
                  <FeaturedRow
                    videos={featuredVideos}
                    onVideoClick={handleVideoClick}
                  />
                )}
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
    </div>
  );
}
