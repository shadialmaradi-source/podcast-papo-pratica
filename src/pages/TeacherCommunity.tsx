import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { trackEvent, trackPageLoad } from "@/lib/analytics";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, BookOpen, Search, Trophy, Globe } from "lucide-react";
import { CommunityLessonCard, type CommunityLesson } from "@/components/teacher/CommunityLessonCard";

const CEFR_LEVELS = ["All", "A1", "A2", "B1", "B2", "C1", "C2"];
const LANGUAGES = [
  { value: "all", label: "All Languages" },
  { value: "italian", label: "Italian" },
  { value: "spanish", label: "Spanish" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "german", label: "German" },
  { value: "dutch", label: "Dutch" },
  { value: "english", label: "English" },
];
const SORT_OPTIONS = [
  { value: "most_copied", label: "Most Copied" },
  { value: "newest", label: "Newest" },
];

export default function TeacherCommunity() {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [lessons, setLessons] = useState<CommunityLesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("All");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [sortBy, setSortBy] = useState("most_copied");

  useEffect(() => {
    if (!roleLoading && role !== "teacher") {
      navigate("/app");
    }
  }, [role, roleLoading, navigate]);

  useEffect(() => {
    trackEvent("community_viewed");
    trackPageLoad("teacher_community");
    fetchLessons();
  }, []);

  const fetchLessons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("community_lessons" as any)
      .select("*")
      .order("copy_count", { ascending: false });

    if (!error && data) {
      setLessons(data as any as CommunityLesson[]);
    }
    setLoading(false);
  };

  const filtered = useMemo(() => {
    let result = [...lessons];
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          (l.topic && l.topic.toLowerCase().includes(q)) ||
          l.teacher_name.toLowerCase().includes(q)
      );
    }
    if (levelFilter !== "All") {
      result = result.filter((l) => l.cefr_level === levelFilter);
    }
    if (languageFilter !== "all") {
      result = result.filter((l) => l.language === languageFilter);
    }
    if (sortBy === "newest") {
      result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else {
      result.sort((a, b) => b.copy_count - a.copy_count);
    }
    return result;
  }, [lessons, search, levelFilter, languageFilter, sortBy]);

  // Top contributors
  const topContributors = useMemo(() => {
    const map = new Map<string, { name: string; copies: number }>();
    for (const l of lessons) {
      const existing = map.get(l.teacher_id) || { name: l.teacher_name, copies: 0 };
      existing.copies += l.copy_count;
      existing.name = l.teacher_name || "Anonymous";
      map.set(l.teacher_id, existing);
    }
    return Array.from(map.values())
      .sort((a, b) => b.copies - a.copies)
      .slice(0, 5);
  }, [lessons]);

  const handleCopy = async (lesson: CommunityLesson) => {
    if (!user) return;
    setCopyingId(lesson.id);
    try {
      // 1. Fetch source lesson
      const { data: source, error: srcErr } = await supabase
        .from("teacher_lessons")
        .select("*")
        .eq("id", lesson.source_lesson_id)
        .single();

      if (srcErr || !source) throw new Error("Source lesson not found");

      // 2. Create duplicate
      const newToken = crypto.randomUUID();
      const s = source as any;
      const { data: newLesson, error: insertErr } = await supabase
        .from("teacher_lessons")
        .insert({
          teacher_id: user.id,
          title: s.title,
          description: s.description,
          cefr_level: s.cefr_level,
          exercise_types: s.exercise_types,
          status: "draft",
          lesson_type: s.lesson_type,
          share_token: newToken,
          language: s.language,
          translation_language: s.translation_language,
          paragraph_prompt: s.paragraph_prompt,
          paragraph_content: s.paragraph_content,
          youtube_url: s.youtube_url,
          topic: s.topic,
          transcript: s.transcript,
          is_community_shared: false,
        } as any)
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      // 3. Duplicate exercises
      const { data: srcExercises } = await supabase
        .from("lesson_exercises")
        .select("*")
        .eq("lesson_id", lesson.source_lesson_id)
        .order("order_index");

      if (srcExercises && srcExercises.length > 0 && newLesson) {
        const dupes = srcExercises.map((ex: any) => ({
          lesson_id: newLesson.id,
          exercise_type: ex.exercise_type,
          content: ex.content,
          order_index: ex.order_index,
        }));
        await supabase.from("lesson_exercises").insert(dupes as any);
      }

      // 4. Increment copy count
      await supabase.rpc("increment_community_copy_count", { lesson_id: lesson.id } as any);

      trackEvent("lesson_copied", { source_lesson_id: lesson.source_lesson_id, community_lesson_id: lesson.id });

      toast({ title: "Lesson copied!", description: "It's now in your dashboard." });
      // Update local count
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, copy_count: l.copy_count + 1 } : l))
      );
    } catch (err: any) {
      toast({ title: "Copy failed", description: err.message, variant: "destructive" });
    } finally {
      setCopyingId(null);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/teacher")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Globe className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Teacher Community</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-5xl">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search lessons..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CEFR_LEVELS.map((l) => (
                <SelectItem key={l} value={l}>{l === "All" ? "All Levels" : l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={languageFilter} onValueChange={setLanguageFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-lg font-medium text-foreground">No lessons found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lessons.length === 0
                      ? "Be the first to share a lesson with the community!"
                      : "Try adjusting your search or filters."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((lesson) => (
                  <CommunityLessonCard
                    key={lesson.id}
                    lesson={lesson}
                    onCopy={handleCopy}
                    copying={copyingId === lesson.id}
                    isOwn={lesson.teacher_id === user?.id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Top Contributors sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold text-foreground">Top Contributors</h2>
                </div>
                {topContributors.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No contributors yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topContributors.map((c, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                          <span className="text-sm font-medium text-foreground truncate max-w-[120px]">
                            {c.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {c.copies} {c.copies === 1 ? "copy" : "copies"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
