import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useDebounce } from "@/hooks/useDebounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCard } from "@/components/library/VideoCard";
import { Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommunityVideoBrowserProps {
  onSelectVideo: (youtubeUrl: string) => void;
}

interface VideoRow {
  id: string;
  video_id: string;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  difficulty_level: string;
  language: string;
  is_short: boolean;
}

const LANGUAGES = [
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
];

export function CommunityVideoBrowser({ onSelectVideo }: CommunityVideoBrowserProps) {
  const { user } = useAuth();
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [teacherLanguages, setTeacherLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  // Fetch teacher languages
  useEffect(() => {
    if (!user) return;
    supabase
      .from("teacher_profiles" as any)
      .select("languages_taught")
      .eq("teacher_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        const langs = (data as any)?.languages_taught as string[] | null;
        if (langs && langs.length > 0) {
          setTeacherLanguages(langs);
          setSelectedLanguage(langs[0]);
        }
      });
  }, [user]);

  // Fetch videos
  useEffect(() => {
    if (teacherLanguages.length === 0) return;

    const fetchVideos = async () => {
      setLoading(true);
      let query = supabase
        .from("youtube_videos" as any)
        .select("id, video_id, title, thumbnail_url, duration, difficulty_level, language, is_short")
        .eq("status", "ready")
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedLanguage !== "all") {
        query = query.eq("language", selectedLanguage);
      } else {
        query = query.in("language", teacherLanguages);
      }

      if (selectedDifficulty !== "all") {
        query = query.eq("difficulty_level", selectedDifficulty);
      }

      if (debouncedSearch) {
        query = query.ilike("title", `%${debouncedSearch}%`);
      }

      const { data, error } = await query;
      if (!error && data) {
        setVideos(data as VideoRow[]);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [teacherLanguages, selectedLanguage, selectedDifficulty, debouncedSearch]);

  const handleSelectVideo = (video: VideoRow) => {
    const url = `https://www.youtube.com/watch?v=${video.video_id}`;
    onSelectVideo(url);
  };

  if (teacherLanguages.length === 0 && !loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No languages configured in your teacher profile.</p>
        <p className="text-sm mt-1">Go to Settings → Branding to set your languages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Select a Video</h3>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {teacherLanguages.length > 1 && (
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Languages</SelectItem>
              {teacherLanguages.map((lang) => {
                const l = LANGUAGES.find((x) => x.value === lang);
                return (
                  <SelectItem key={lang} value={lang}>
                    {l?.label || lang}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="beginner">Beginner</SelectItem>
            <SelectItem value="intermediate">Intermediate</SelectItem>
            <SelectItem value="advanced">Advanced</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Video grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-lg" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No videos found for the selected filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {videos.map((video) => (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              thumbnailUrl={video.thumbnail_url}
              duration={video.duration}
              difficultyLevel={video.difficulty_level}
              isCurated={false}
              onClick={() => handleSelectVideo(video)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
