import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Loader2 } from "lucide-react";

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;

const EXERCISE_TYPES = [
  { id: "fill_in_blank", label: "Fill in the Blank" },
  { id: "multiple_choice", label: "Multiple Choice (Quiz)" },
  { id: "image_discussion", label: "Image Discussion" },
  { id: "role_play", label: "Role-play" },
  { id: "spot_the_mistake", label: "Spot the Mistake" },
] as const;

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  // Standard: youtube.com/watch?v=ID
  let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  // Short: youtu.be/ID
  match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  // Shorts: youtube.com/shorts/ID
  match = url.match(/\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  // Embed: youtube.com/embed/ID
  match = url.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (match) return match[1];
  return null;
}

const formSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  student_email: z.string().email("Enter a valid student email"),
  topic: z.string().optional(),
  youtube_url: z.string().optional().refine(
    (val) => !val || extractYouTubeId(val) !== null,
    "Enter a valid YouTube URL (videos, shorts, or embeds)"
  ),
  cefr_level: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]),
  exercise_types: z.array(z.string()).min(1, "Select at least one exercise type"),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateLessonFormProps {
  onCreated: (lessonId: string) => void;
  onCancel: () => void;
}

export function CreateLessonForm({ onCreated, onCancel }: CreateLessonFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      student_email: "",
      topic: "",
      youtube_url: "",
      cefr_level: "A1",
      exercise_types: [],
    },
  });

  const onSubmit = async (values: FormValues) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from("teacher_lessons").insert({
        teacher_id: user.id,
        title: values.title,
        student_email: values.student_email,
        topic: values.topic || null,
        youtube_url: values.youtube_url || null,
        cefr_level: values.cefr_level,
        exercise_types: values.exercise_types,
        status: "draft",
      } as any).select("id").single();

      if (error) throw error;

      toast({ title: "Lesson created!", description: "Your lesson draft has been saved." });
      onCreated(data.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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

        {/* Topic (optional) */}
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

        {/* YouTube URL (optional) */}
        <FormField
          control={form.control}
          name="youtube_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>YouTube Video <span className="text-muted-foreground text-xs">(optional — videos & shorts)</span></FormLabel>
              <FormControl>
                <Input placeholder="https://youtube.com/watch?v=... or youtube.com/shorts/..." {...field} />
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
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
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
                {EXERCISE_TYPES.map((type) => (
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
                                  : current.filter((v) => v !== type.id)
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
      </form>
    </Form>
  );
}
