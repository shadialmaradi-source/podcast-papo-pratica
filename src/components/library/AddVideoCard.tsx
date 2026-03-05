import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AddVideoCardProps {
  onClick: () => void;
}

export function AddVideoCard({ onClick }: AddVideoCardProps) {
  return (
    <Card
      className="cursor-pointer border-2 border-dashed border-primary/40 hover:border-primary hover:bg-primary/5 transition-colors h-full flex items-center justify-center min-h-[180px]"
      onClick={onClick}
    >
      <CardContent className="p-6 flex flex-col items-center text-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Add Your YouTube Video</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Paste a link and start practicing
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
