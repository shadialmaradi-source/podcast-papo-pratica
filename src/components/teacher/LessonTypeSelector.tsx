import { Card, CardContent } from "@/components/ui/card";
import { FileText, Youtube, MessageSquare } from "lucide-react";

type LessonType = "paragraph" | "youtube" | "speaking";

interface LessonTypeSelectorProps {
  onSelect: (type: LessonType) => void;
}

const options: { type: LessonType; icon: typeof FileText; title: string; description: string }[] = [
  {
    type: "paragraph",
    icon: FileText,
    title: "Custom Paragraph",
    description: "AI generates a reading passage with exercises tailored to your topic and level.",
  },
  {
    type: "youtube",
    icon: Youtube,
    title: "Video-Based Lesson",
    description: "Build comprehension exercises from any YouTube video.",
  },
  {
    type: "speaking",
    icon: MessageSquare,
    title: "Speaking Practice",
    description: "Create discussion prompts with AI-generated questions and key vocabulary.",
  },
];

export function LessonTypeSelector({ onSelect }: LessonTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <Card
            key={opt.type}
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelect(opt.type)}
          >
            <CardContent className="flex flex-col items-center text-center gap-3 p-6">
              <opt.icon className="h-10 w-10 text-primary" />
              <div>
                <p className="font-semibold text-foreground">{opt.title}</p>
                <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
