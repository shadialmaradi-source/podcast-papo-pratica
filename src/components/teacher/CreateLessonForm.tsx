import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Sparkles, Copy, Check } from "lucide-react";

type LessonType = "paragraph" | "youtube";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const EXERCISE_TYPES_PARAGRAPH = [
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "flashcards", label: "Flashcards" },
] as const;

const EXERCISE_TYPES_YOUTUBE = [
  { id: "fill_in_blank", label: "Fill in the Blank" },
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "image_discussion", label: "Image Discussion" },
  { id: "role_play", label: "Role-play" },
  { id: "spot_the_mistake", label: "Spot the Mistake" },
] as const;

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

const baseSchema = {
  title: z.string().min(3, "Title must be at least 3 characters"),
  student_email: z.string().email("Enter a valid student email"),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  exercise_types: z.array(z.string()).min(1, "Select at least one exercise type"),
};

const paragraphSchema = z.object({
  ...baseSchema,
  paragraph_prompt: z.string().min(10, "Describe the paragraph in at least 10 characters"),
});

const youtubeSchema = z.object({
  ...baseSchema,
  topic: z.string().optional(),
  youtube_url: z.string().min(1, "Enter a YouTube URL").refine(
    (val) => extractYouTubeId(val) !== null,
    "Enter a valid YouTube URL"
  ),
});

interface CreateLessonFormProps {
  lessonType: LessonType;
  onCreated: (lessonId: string) => void;
  onCancel: () => void;
}

export function CreateLessonForm({ lessonType, onCreated, onCancel }: CreateLessonFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generatingParagraph, setGeneratingParagraph] = useState(false);
  const [paragraphContent, setParagraphContent] = useState("");
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isParagraph = lessonType === "paragraph";
  const schema = isParagraph ? paragraphSchema : youtubeSchema;
  const exerciseTypes = isParagraph ? EXERCISE_TYPES_PARAGRAPH : EXERCISE_TYPES_YOUTUBE;

  const form = useForm<any>({
    resolver: zodResolver(schema as any),
    defaultValues: {
      title: "",
      student_email: "",
      cefr_level: "A1",
      exercise_types: [],
      ...(isParagraph
        ? { paragraph_prompt: "" }
        : { topic: "", youtube_url: "" }),
    },
  });

  const handleGenerateParagraph = async () => {
    const prompt = form.getValues("paragraph_prompt");
    const cefrLevel = form.getValues("cefr_level");
    if (!prompt || prompt.length < 10) {
      toast({ title: "Prompt too short", description: "Describe the paragraph in at least 10 characters.", variant: "destructive" });
      return;
    }
    setGeneratingParagraph(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-paragraph", {
        body: { prompt, cefrLevel },
      });
      if (error) throw error;
      setParagraphContent(data.paragraph);
      if (data.suggestedTitle && !form.getValues("title")) {
        form.setValue("title", data.suggestedTitle);
      }
      toast({ title: "Paragraph generated!" });
    } catch (err: any) {
      toast({ title: "Error generating paragraph", description: err.message, variant: "destructive" });
    } finally {
      setGeneratingParagraph(false);
    }
  };

  const onSubmit = async (values: any) => {
    if (!user) return;
    if (isParagraph && !paragraphContent) {
      toast({ title: "Generate a paragraph first", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const shareToken = crypto.randomUUID();
      const insertData: any = {
        teacher_id: user.id,
        title: values.title,
        student_email: values.student_email,
        cefr_level: values.cefr_level,
        exercise_types: values.exercise_types,
        status: "draft",
        lesson_type: lessonType,
        share_token: shareToken,
      };

      if (isParagraph) {
        insertData.paragraph_prompt = values.paragraph_prompt;
        insertData.paragraph_content = paragraphContent;
      } else {
        insertData.topic = values.topic || null;
        insertData.youtube_url = values.youtube_url;
      }

      const { data, error } = await supabase
        .from("teacher_lessons")
        .insert(insertData as any)
        .select("id")
        .single();

      if (error) throw error;

      const link = `${window.location.origin}/lesson/student/${shareToken}`;
      setShareLink(link);
      toast({ title: "Lesson created!", description: "Your lesson draft has been saved." });
      onCreated(data.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Paragraph-specific fields */}
        {isParagraph && (
          <>
            <FormField
              control={form.control}
              name="paragraph_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Describe the paragraph you want to generate</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g. Giuseppe arrives in Rio de Janeiro and checks into a hostel for the first time"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="button"
              variant="outline"
              onClick={handleGenerateParagraph}
              disabled={generatingParagraph}
            >
              {generatingParagraph ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Paragraph
            </Button>

            {paragraphContent && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4">
                  <FormLabel className="mb-2 block">Generated Paragraph</FormLabel>
                  <Textarea
                    value={paragraphContent}
                    onChange={(e) => setParagraphContent(e.target.value)}
                    rows={6}
                    className="bg-background"
                  />
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* YouTube-specific fields */}
        {!isParagraph && (
          <>
            <FormField
              control={form.control}
              name="youtube_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube Video URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://youtube.com/watch?v=... or youtube.com/shorts/..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic <span className="text-muted-foreground text-xs">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ordering food at a restaurant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* Title */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Present Tense Practice" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Student Email */}
        <FormField
          control={form.control}
          name="student_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Email</FormLabel>
              <FormControl>
                <Input placeholder="student@example.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* CEFR Level */}
        <FormField
          control={form.control}
          name="cefr_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEFR Level</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CEFR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Exercise Types */}
        <FormField
          control={form.control}
          name="exercise_types"
          render={() => (
            <FormItem>
              <FormLabel>Exercise Types</FormLabel>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {exerciseTypes.map((type) => (
                  <FormField
                    key={type.id}
                    control={form.control}
                    name="exercise_types"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(type.id)}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              field.onChange(
                                checked
                                  ? [...current, type.id]
                                  : current.filter((v: string) => v !== type.id)
                              );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal cursor-pointer">{type.label}</FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading} className="flex-1">
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Lesson
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>

        {/* Share Link (shown after creation) */}
        {shareLink && (
          <Card className="border-primary/30">
            <CardContent className="pt-4 flex items-center gap-2">
              <Input value={shareLink} readOnly className="flex-1 text-sm" />
              <Button type="button" size="sm" variant="outline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CardContent>
          </Card>
        )}
      </form>
    </Form>
  );
}
