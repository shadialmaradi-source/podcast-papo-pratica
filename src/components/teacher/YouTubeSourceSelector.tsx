import { Card, CardContent } from "@/components/ui/card";
import { Link, Globe } from "lucide-react";

type YouTubeSource = "scratch" | "community";

interface YouTubeSourceSelectorProps {
  onSelect: (source: YouTubeSource) => void;
}

const options: { source: YouTubeSource; icon: typeof Link; title: string; description: string }[] = [
  {
    source: "scratch",
    icon: Link,
    title: "From Scratch",
    description: "Paste a YouTube URL to build exercises from",
  },
  {
    source: "community",
    icon: Globe,
    title: "From Community",
    description: "Browse existing videos from the platform library",
  },
];

export function YouTubeSourceSelector({ onSelect }: YouTubeSourceSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Choose Video Source</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => (
          <Card
            key={opt.source}
            className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
            onClick={() => onSelect(opt.source)}
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
