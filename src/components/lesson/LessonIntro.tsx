import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Brain, Mic, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

interface LessonIntroProps {
  onStart: () => void;
  level: string;
  language?: string;
}

const languageNames: Record<string, string> = {
  english: 'English',
  spanish: 'Spanish',
  italian: 'Italian',
  portuguese: 'Portuguese',
  french: 'French',
  german: 'German',
};

const LessonIntro = ({ onStart, level, language = 'english' }: LessonIntroProps) => {
  const lessonLanguage = languageNames[language?.toLowerCase()] || language;
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
      className="min-h-[100dvh] bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col"
    >
      <div className="flex-1 overflow-auto p-3 md:p-8">
        <div className="max-w-2xl mx-auto space-y-4 md:space-y-8">
          <div className="text-center space-y-2 md:space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="w-14 h-14 md:w-20 md:h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center"
            >
              <Play className="w-7 h-7 md:w-10 md:h-10 text-primary" />
            </motion.div>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground">
              {lessonLanguage ? `Your First ${lessonLanguage} Lesson` : "Your First Lesson"}
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Learn {lessonLanguage || 'a language'} through real conversations
            </p>
          </div>

          <Card className="shadow-xl rounded-2xl border-0 bg-card/80 backdrop-blur">
            <CardContent className="p-4 md:p-8 space-y-4 md:space-y-6">
              <p className="text-foreground text-base md:text-lg leading-relaxed">
                You're going to watch a <span className="font-semibold text-primary">{getDuration()}-second</span> real conversation.
              </p>
              
              <div className="space-y-3 md:space-y-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Comprehension Check</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      Answer 10 questions to test your understanding
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Speaking Practice</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      Practice key phrases from the conversation
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 md:gap-4">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm md:text-base">Vocabulary Flashcards</h3>
                    <p className="text-muted-foreground text-xs md:text-sm">
                      Save 5 essential phrases to your collection
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-3 md:p-4 border border-primary/20">
                <p className="text-xs md:text-sm text-muted-foreground text-center">
                  <span className="text-primary font-medium">Science-backed method:</span> Listening comprehension + speaking practice = fastest path to fluency
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 p-3 md:p-6 bg-background/80 backdrop-blur border-t md:border-0">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={onStart}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-full py-5 md:py-6 text-base md:text-lg shadow-lg hover:shadow-xl transition-all"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Lesson
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default LessonIntro;
