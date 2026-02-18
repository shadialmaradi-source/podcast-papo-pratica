import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, User } from "lucide-react";

interface Lesson {
  id: string;
  title: string;
  student_email: string | null;
  cefr_level: string;
  topic: string | null;
  status: string;
  exercise_types: string[];
  created_at: string;
}

interface LessonListProps {
  refresh: number;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "secondary",
  active: "default",
  completed: "outline",
};

export function LessonList({ refresh }: LessonListProps) {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("teacher_lessons")
        .select("id, title, student_email, cefr_level, topic, status, exercise_types, created_at")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) setLessons(data as Lesson[]);
      setLoading(false);
    };
    fetch();
  }, [user, refresh]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (lessons.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <BookOpen className="mx-auto h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">No lessons yet. Create your first one above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {lessons.map((lesson) => (
        <Card key={lesson.id} className="border border-border">
          <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-foreground truncate">{lesson.title}</span>
                <Badge variant={STATUS_COLORS[lesson.status] as any} className="shrink-0 capitalize">
                  {lesson.status}
                </Badge>
              </div>
              {lesson.student_email && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                  <User className="h-3 w-3" />
                  <span>{lesson.student_email}</span>
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1">
                <Badge variant="outline" className="text-xs">{lesson.cefr_level}</Badge>
                {lesson.exercise_types.slice(0, 3).map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs capitalize">
                    {t.replace(/_/g, " ")}
                  </Badge>
                ))}
                {lesson.exercise_types.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{lesson.exercise_types.length - 3}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
