import { Card, CardContent } from "@/components/ui/card";
import { FileText, Youtube } from "lucide-react";

type LessonType = "paragraph" | "youtube";

interface LessonTypeSelectorProps {
  onSelect: (type: LessonType) => void;
}

const options: { type: LessonType; icon: typeof FileText; title: string; description: string }[] = [
  {
    type: "paragraph",
    icon: FileText,
    title: "Custom Paragraph",
    description: "Generate a paragraph with AI and create exercises from it",
  },
  {
    type: "youtube",
    icon: Youtube,
    title: "YouTube / Video Link",
    description: "Use an existing video to build exercises",
  },
];

export function LessonTypeSelector({ onSelect }: LessonTypeSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Choose Lesson Type</h3>
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
