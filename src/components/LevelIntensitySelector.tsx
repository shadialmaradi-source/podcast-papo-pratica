import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { Target, BookOpen, Zap, Award, Loader2 } from "lucide-react";

interface LevelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (level: string) => void;
  title?: string;
  isLoading?: boolean;
}

const DIFFICULTY_LEVELS = [
  { 
    code: "beginner", 
    name: "Beginner", 
    icon: BookOpen,
    color: "bg-green-500/10 border-green-500/30 hover:border-green-500/60",
    iconColor: "text-green-500",
    description: "A1-A2",
    detail: "Basic vocabulary and simple sentences"
  },
  { 
    code: "intermediate", 
    name: "Intermediate", 
    icon: Zap,
    color: "bg-orange-500/10 border-orange-500/30 hover:border-orange-500/60",
    iconColor: "text-orange-500",
    description: "B1-B2",
    detail: "Complex grammar and varied topics"
  },
  { 
    code: "advanced", 
    name: "Advanced", 
    icon: Award,
    color: "bg-red-500/10 border-red-500/30 hover:border-red-500/60",
    iconColor: "text-red-500",
    description: "C1-C2",
    detail: "Nuanced language and abstract concepts"
  },
];

export function LevelIntensitySelector({ isOpen, onClose, onSelect, title = "Scegli il Livello", isLoading = false }: LevelSelectorProps) {
  const handleLevelSelect = (level: string) => {
    if (isLoading) return;
    onSelect(level);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isLoading && !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Target className="h-5 w-5" />
            )}
            {title}
          </DialogTitle>
        </DialogHeader>
        
        {isLoading ? (
          <div className="py-8 flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground text-center">
              Generazione esercizi in corso con GPT-5...<br />
              Questo può richiedere 15-30 secondi.
            </p>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Seleziona il livello di difficoltà per gli esercizi (20 domande)
            </p>
            
            <div className="space-y-3">
              {DIFFICULTY_LEVELS.map((level) => {
                const IconComponent = level.icon;
                return (
                  <motion.div
                    key={level.code}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={() => handleLevelSelect(level.code)}
                    className="cursor-pointer"
                  >
                    <div className={`border rounded-lg p-4 flex items-center gap-4 transition-all ${level.color}`}>
                      <div className={`p-3 rounded-full bg-background ${level.iconColor}`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{level.name}</span>
                          <span className="text-xs text-muted-foreground">({level.description})</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{level.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}