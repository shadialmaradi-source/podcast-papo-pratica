import { Play, Clock, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  category: string | null;
  duration: number | null;
  difficultyLevel: string;
  isCurated: boolean;
  onClick: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatCategory(category: string | null): string {
  if (!category) return "General";
  // Normalize category names
  const categoryMap: Record<string, string> = {
    'restaurant': 'Restaurant',
    'travel': 'Travel',
    'viaggi': 'Travel',
    'daily': 'Daily Life',
    'daily life': 'Daily Life',
    'work': 'Work',
    'business': 'Work',
    'cultura': 'Culture',
    'culture': 'Culture',
  };
  return categoryMap[category.toLowerCase()] || category;
}

function getCategoryIcon(category: string | null): string {
  if (!category) return "📚";
  const iconMap: Record<string, string> = {
    'restaurant': '🍽️',
    'travel': '✈️',
    'viaggi': '✈️',
    'daily': '🏠',
    'daily life': '🏠',
    'work': '💼',
    'business': '💼',
    'cultura': '🎭',
    'culture': '🎭',
  };
  return iconMap[category.toLowerCase()] || '📚';
}

export function VideoCard({
  title,
  thumbnailUrl,
  category,
  duration,
  difficultyLevel,
  isCurated,
  onClick,
}: VideoCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] group",
        isCurated ? "bg-card" : "bg-muted/30"
      )}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
            <Play className="w-12 h-12 text-primary/50" />
          </div>
        )}
        
        {/* Play overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg">
            <Play className="w-5 h-5 text-primary-foreground ml-0.5" fill="currentColor" />
          </div>
        </div>

        {/* Curated badge */}
        {isCurated && (
          <Badge className="absolute top-2 right-2 bg-primary/90 text-primary-foreground text-xs">
            ListenFlow
          </Badge>
        )}
      </div>

      <CardContent className="p-3">
        {/* Title */}
        <h3 className="font-medium text-foreground line-clamp-2 mb-2 text-sm">
          {title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            {getCategoryIcon(category)} {formatCategory(category)}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(duration)}
          </span>
          <Badge variant="outline" className="text-xs py-0 px-1.5 capitalize">
            {difficultyLevel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
