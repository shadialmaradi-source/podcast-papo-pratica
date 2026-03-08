import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Loader2, User } from "lucide-react";

interface CommunityLesson {
  id: string;
  source_lesson_id: string;
  teacher_name: string;
  title: string;
  description: string | null;
  lesson_type: string;
  language: string;
  translation_language: string;
  cefr_level: string;
  topic: string | null;
  exercise_types: string[];
  copy_count: number;
  created_at: string;
  teacher_id: string;
}

interface CommunityLessonCardProps {
  lesson: CommunityLesson;
  onCopy: (lesson: CommunityLesson) => void;
  copying: boolean;
  isOwn: boolean;
}

const LANGUAGE_LABELS: Record<string, string> = {
  italian: "🇮🇹 Italian",
  spanish: "🇪🇸 Spanish",
  french: "🇫🇷 French",
  portuguese: "🇧🇷 Portuguese",
  german: "🇩🇪 German",
  dutch: "🇳🇱 Dutch",
  english: "🇬🇧 English",
};

export function CommunityLessonCard({ lesson, onCopy, copying, isOwn }: CommunityLessonCardProps) {
  return (
    <Card className="transition-all hover:shadow-md hover:border-primary/30">
      <CardContent className="pt-5 pb-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground truncate">{lesson.title}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{lesson.teacher_name || "Anonymous"}</span>
            </div>
          </div>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {lesson.cefr_level}
          </Badge>
        </div>

        {lesson.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{lesson.description}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs">
            {LANGUAGE_LABELS[lesson.language] || lesson.language}
          </Badge>
          <Badge variant="outline" className="text-xs capitalize">
            {lesson.lesson_type}
          </Badge>
          {lesson.exercise_types.slice(0, 2).map((t) => (
            <Badge key={t} variant="outline" className="text-xs capitalize">
              {t.replace(/_/g, " ")}
            </Badge>
          ))}
          {lesson.exercise_types.length > 2 && (
            <Badge variant="outline" className="text-xs">+{lesson.exercise_types.length - 2}</Badge>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-muted-foreground">
            {lesson.copy_count} {lesson.copy_count === 1 ? "copy" : "copies"}
          </span>
          <Button
            size="sm"
            variant={isOwn ? "outline" : "default"}
            disabled={copying || isOwn}
            onClick={() => onCopy(lesson)}
            className="gap-1.5"
          >
            {copying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            {isOwn ? "Your Lesson" : "Copy to My Lessons"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export type { CommunityLesson };
