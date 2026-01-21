import { Play, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  topics?: string[];
  duration: number | null;
  difficultyLevel: string;
  isCurated: boolean;
  onClick: () => void;
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds === 0) return "";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatTopic(topic: string): string {
  const topicLabels: Record<string, string> = {
    'technology': 'Technology',
    'business': 'Business',
    'travel': 'Travel',
    'culture': 'Culture',
    'food': 'Food',
    'lifestyle': 'Lifestyle',
    'music': 'Music',
    'sport': 'Sport',
    'science': 'Science',
    'history': 'History',
    'language': 'Language',
    'art': 'Art',
    'conversation': 'Conversation',
    'entertainment': 'Entertainment',
    'health': 'Health',
    // Legacy mappings
    'cucina': 'Food',
    'viaggi': 'Travel',
    'cultura': 'Culture',
    'tecnologia': 'Technology',
  };
  return topicLabels[topic.toLowerCase()] || topic.charAt(0).toUpperCase() + topic.slice(1);
}

function getTopicIcon(topic: string): string {
  const iconMap: Record<string, string> = {
    'technology': '💻',
    'business': '💼',
    'travel': '✈️',
    'culture': '🎭',
    'food': '🍽️',
    'lifestyle': '🏠',
    'music': '🎵',
    'sport': '⚽',
    'science': '🔬',
    'history': '📜',
    'language': '📚',
    'art': '🎨',
    'conversation': '💬',
    'entertainment': '🎬',
    'health': '❤️',
    // Legacy mappings
    'cucina': '🍽️',
    'viaggi': '✈️',
    'cultura': '🎭',
    'tecnologia': '💻',
  };
  return iconMap[topic.toLowerCase()] || '📚';
}

export function VideoCard({
  title,
  thumbnailUrl,
  topics = [],
  duration,
  difficultyLevel,
  isCurated,
  onClick,
}: VideoCardProps) {
  const durationDisplay = formatDuration(duration);
  
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

        {/* Duration badge */}
        {durationDisplay && (
          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
            {durationDisplay}
          </div>
        )}
      </div>

      <CardContent className="p-3">
        {/* Title */}
        <h3 className="font-medium text-foreground line-clamp-2 mb-2 text-sm">
          {title}
        </h3>

        {/* Meta info */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          {/* Topics (up to 3) */}
          {topics.slice(0, 3).map((topic, index) => (
            <span key={topic} className="flex items-center gap-0.5">
              {getTopicIcon(topic)} {formatTopic(topic)}
              {index < Math.min(topics.length, 3) - 1 && <span className="ml-1">•</span>}
            </span>
          ))}
          {topics.length === 0 && (
            <span className="flex items-center gap-1">
              📚 General
            </span>
          )}
          <Badge variant="outline" className="text-xs py-0 px-1.5 capitalize ml-auto">
            {difficultyLevel}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
