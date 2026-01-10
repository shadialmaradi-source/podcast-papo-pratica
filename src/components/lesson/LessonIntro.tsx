import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Brain, Mic, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface LessonIntroProps {
  onStart: () => void;
  level: string;
}

const LessonIntro = ({ onStart, level }: LessonIntroProps) => {
  const getDuration = () => {
    switch (level) {
      case 'absolute_beginner': return '60';
      case 'beginner': return '75';
      case 'intermediate': return '75';
      case 'advanced': return '90';
      default: return '60-90';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4 md:p-8"
    >
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center"
          >
            <Play className="w-10 h-10 text-primary" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Your First Lesson
          </h1>
          <p className="text-muted-foreground text-lg">
            Learn Spanish through real conversations
          </p>
        </div>

        <Card className="shadow-xl rounded-2xl border-0 bg-card/80 backdrop-blur">
          <CardContent className="p-6 md:p-8 space-y-6">
            <p className="text-foreground text-lg leading-relaxed">
              You're going to watch a <span className="font-semibold text-primary">{getDuration()}-second</span> real conversation.
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Comprehension Check</h3>
                  <p className="text-muted-foreground text-sm">
                    Answer 10 questions to test your understanding
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Mic className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Speaking Practice</h3>
                  <p className="text-muted-foreground text-sm">
                    Practice key phrases from the conversation
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Vocabulary Flashcards</h3>
                  <p className="text-muted-foreground text-sm">
                    Save 5 essential phrases to your collection
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 rounded-xl p-4 border border-primary/20">
              <p className="text-sm text-muted-foreground text-center">
                <span className="text-primary font-medium">Science-backed method:</span> Listening comprehension + speaking practice = fastest path to fluency
              </p>
            </div>
          </CardContent>
        </Card>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Button
            onClick={onStart}
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Lesson
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LessonIntro;
