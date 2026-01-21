import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoCard } from "./VideoCard";

interface Video {
  id: string;
  title: string;
  thumbnail_url: string | null;
  topics?: string[];
  duration: number | null;
  difficulty_level: string;
  is_curated: boolean;
}

interface FeaturedRowProps {
  videos: Video[];
  onVideoClick: (videoId: string) => void;
}

export function FeaturedRow({ videos, onVideoClick }: FeaturedRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 280; // Card width + gap
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (videos.length === 0) return null;

  return (
    <div className="relative group">
      <h2 className="text-lg font-semibold text-foreground mb-3">Featured</h2>
      
      <div className="relative">
        {/* Scroll buttons */}
        <Button
          variant="secondary"
          size="icon"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden md:flex"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="secondary"
          size="icon"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hidden md:flex"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>

        {/* Scrollable container */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {videos.slice(0, 6).map((video) => (
            <div
              key={video.id}
              className="flex-shrink-0 w-[260px]"
              style={{ scrollSnapAlign: 'start' }}
            >
              <VideoCard
                id={video.id}
                title={video.title}
                thumbnailUrl={video.thumbnail_url}
                topics={video.topics}
                duration={video.duration}
                difficultyLevel={video.difficulty_level}
                isCurated={video.is_curated}
                onClick={() => onVideoClick(video.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
