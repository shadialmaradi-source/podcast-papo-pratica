import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Target, Zap, BookOpen, Brain } from "lucide-react";

interface LevelIntensitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (level: string, intensity: string) => void;
  level: string;
  title?: string;
}

const DIFFICULTY_LEVELS = [
  { code: "beginner", name: "Beginner", color: "bg-green-500", description: "Basic vocabulary and simple sentences" },
  { code: "intermediate", name: "Intermediate", color: "bg-warning", description: "Complex grammar and varied topics" },
  { code: "advanced", name: "Advanced", color: "bg-destructive", description: "Nuanced language and abstract concepts" },
];

const INTENSITY_OPTIONS = [
  { 
    code: "light", 
    name: "Light Mode", 
    icon: BookOpen,
    color: "bg-green-100 text-green-800", 
    description: "10 focused questions",
    detail: "Perfect for a quick practice session"
  },
  { 
    code: "intense", 
    name: "Intense Mode", 
    icon: Brain,
    color: "bg-orange-100 text-orange-800", 
    description: "20 comprehensive questions",
    detail: "Deep dive into the content"
  },
];

export function LevelIntensitySelector({ isOpen, onClose, onSelect, level, title = "Choose Exercise Settings" }: LevelIntensitySelectorProps) {
  const handleIntensitySelect = (intensity: string) => {
    onSelect(level, intensity);
    onClose();
  };

  

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Select Exercise Intensity
            </h3>
            
            <div className="mb-4 p-3 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">
                Selected: {DIFFICULTY_LEVELS.find(l => l.code === level)?.name}
              </div>
              <div className="text-xs text-muted-foreground">
                {DIFFICULTY_LEVELS.find(l => l.code === level)?.description}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {INTENSITY_OPTIONS.map((intensity) => {
                const IconComponent = intensity.icon;
                return (
                  <motion.div
                    key={intensity.code}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleIntensitySelect(intensity.code)}
                    className="cursor-pointer"
                  >
                    <div className="border rounded-lg p-4 flex flex-col gap-3 hover:shadow-md transition-all h-full hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5" />
                        <div className="font-medium">{intensity.name}</div>
                      </div>
                      <Badge variant="outline" className={`${intensity.color} w-fit`}>
                        {intensity.description}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {intensity.detail}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      </DialogContent>
    </Dialog>
  );
}