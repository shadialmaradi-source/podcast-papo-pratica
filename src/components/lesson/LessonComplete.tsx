import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Trophy, Star, Zap, ArrowRight, Video, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

interface LessonCompleteProps {
  exerciseScore: number;
  totalExercises: number;
  phrasesLearned: number;
  flashcardsLearned: number;
}

const LessonComplete = ({ 
  exerciseScore, 
  totalExercises, 
  phrasesLearned, 
  flashcardsLearned 
}: LessonCompleteProps) => {
  const navigate = useNavigate();
  
  const xpEarned = (exerciseScore * 10) + (phrasesLearned * 15) + (flashcardsLearned * 5);
  const accuracy = Math.round((exerciseScore / totalExercises) * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8 flex items-center justify-center"
    >
      <div className="max-w-lg w-full space-y-6">
        {/* Celebration header */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="text-center space-y-4"
        >
          <div className="relative inline-block">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="w-24 h-24 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg"
            >
              <Trophy className="w-12 h-12 text-primary-foreground" />
            </motion.div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.8 }}
              className="absolute -top-2 -right-2"
            >
              <Sparkles className="w-8 h-8 text-amber-500" />
            </motion.div>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Lesson Complete!
          </h1>
          <p className="text-muted-foreground text-lg">
            You're making amazing progress 🎉
          </p>
        </motion.div>

        {/* Stats card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="shadow-xl rounded-2xl border-0">
            <CardContent className="p-6 space-y-6">
              {/* XP earned */}
              <div className="text-center p-4 bg-primary/5 rounded-xl border border-primary/20">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Zap className="w-6 h-6" />
                  <span className="text-3xl font-bold">+{xpEarned} XP</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    {exerciseScore}/{totalExercises}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Questions correct
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    {phrasesLearned}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Phrases practiced
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-foreground">
                    {flashcardsLearned}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Words saved
                  </div>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-medium text-foreground">{accuracy}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${accuracy}%` }}
                    transition={{ delay: 0.6, duration: 0.8 }}
                    className="h-full bg-primary rounded-full"
                  />
                </div>
              </div>

              {/* Achievement */}
              {accuracy >= 80 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                  className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20"
                >
                  <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">First Lesson Badge!</p>
                    <p className="text-xs text-muted-foreground">Completed with 80%+ accuracy</p>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action buttons */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="space-y-3"
        >
          <Button
            onClick={() => navigate('/lesson/second')}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 rounded-full py-6 text-lg gap-2"
            disabled
          >
            <ArrowRight className="w-5 h-5" />
            Next Lesson (Coming Soon)
          </Button>

          <Button
            onClick={() => navigate('/app')}
            variant="outline"
            size="lg"
            className="w-full rounded-full py-6 text-lg gap-2"
          >
            <Video className="w-5 h-5" />
            Try Your Own Video
          </Button>
        </motion.div>

        {/* Footer message */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-sm text-muted-foreground"
        >
          Keep your streak going! Come back tomorrow for more lessons.
        </motion.p>
      </div>
    </motion.div>
  );
};

export default LessonComplete;
