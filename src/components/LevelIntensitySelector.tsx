import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Zap, BookOpen, Brain, ArrowLeft } from "lucide-react";

interface LevelIntensitySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (level: string, intensity: string) => void;
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

export function LevelIntensitySelector({ isOpen, onClose, onSelect, title = "Choose Exercise Settings" }: LevelIntensitySelectorProps) {
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedIntensity, setSelectedIntensity] = useState<string>("");
  const [step, setStep] = useState<'level' | 'intensity'>('level');

  const handleLevelSelect = (level: string) => {
    setSelectedLevel(level);
    setStep('intensity');
  };

  const handleIntensitySelect = (intensity: string) => {
    setSelectedIntensity(intensity);
    // Auto-start when both are selected
    onSelect(selectedLevel, intensity);
    onClose();
    // Reset for next time
    setSelectedLevel("");
    setSelectedIntensity("");
    setStep('level');
  };

  const handleBack = () => {
    setStep('level');
    setSelectedIntensity("");
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
          <AnimatePresence mode="wait">
            {step === 'level' && (
              <motion.div
                key="level"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Select Difficulty Level
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {DIFFICULTY_LEVELS.map((level) => (
                    <motion.div
                      key={level.code}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => handleLevelSelect(level.code)}
                      className="cursor-pointer"
                    >
                      <div className="border rounded-lg p-4 flex items-center gap-4 hover:shadow-md transition-all hover:bg-muted/50">
                        <div className={`w-3 h-3 rounded-full ${level.color}`} />
                        <div className="flex-1">
                          <div className="font-medium">{level.name}</div>
                          <div className="text-sm text-muted-foreground">{level.description}</div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 'intensity' && (
              <motion.div
                key="intensity"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Button variant="ghost" size="sm" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <h3 className="font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Select Exercise Intensity
                  </h3>
                </div>
                
                <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                  <div className="text-sm font-medium">
                    Selected: {DIFFICULTY_LEVELS.find(l => l.code === selectedLevel)?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {DIFFICULTY_LEVELS.find(l => l.code === selectedLevel)?.description}
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
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}