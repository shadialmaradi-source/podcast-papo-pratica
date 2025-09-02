import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, 
  CheckCircle, 
  XCircle, 
  Target,
  Youtube,
  Trophy,
  Star
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface YouTubeExercisesProps {
  videoId: string;
  level: string;
  onBack: () => void;
  onComplete: () => void;
}

interface Exercise {
  id: string;
  type: "multiple-choice" | "fill-blank" | "open-ended" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
}

// Mock exercise data based on CEFR levels
const generateExercises = (videoId: string, level: string): Exercise[] => {
  const baseExercises = {
    A1: [
      {
        id: "a1-1",
        type: "multiple-choice" as const,
        question: "What is the main topic of this video?",
        options: ["Cooking", "Language Learning", "Travel", "Music"],
        correctAnswer: "Language Learning",
        explanation: "The video focuses on language learning strategies and tips.",
        points: 10
      },
      {
        id: "a1-2",
        type: "true-false" as const,
        question: "The speaker mentions practice as important for language learning.",
        options: ["True", "False"],
        correctAnswer: "True",
        explanation: "Practice is emphasized throughout the video as a key element.",
        points: 10
      },
      {
        id: "a1-3",
        type: "multiple-choice" as const,
        question: "How many main points does the speaker make?",
        options: ["2", "3", "4", "5"],
        correctAnswer: "3",
        explanation: "The speaker covers three main learning strategies.",
        points: 10
      }
    ],
    A2: [
      {
        id: "a2-1",
        type: "multiple-choice" as const,
        question: "According to the video, what is the best way to improve listening skills?",
        options: ["Reading books", "Regular practice with authentic content", "Memorizing vocabulary", "Grammar exercises"],
        correctAnswer: "Regular practice with authentic content",
        explanation: "The speaker emphasizes using real-world content for listening practice.",
        points: 15
      },
      {
        id: "a2-2",
        type: "fill-blank" as const,
        question: "The speaker says: 'Consistency is _____ than intensity when learning languages.'",
        correctAnswer: "better",
        explanation: "Regular, consistent practice is more effective than occasional intensive study.",
        points: 15
      },
      {
        id: "a2-3",
        type: "true-false" as const,
        question: "The video suggests that beginners should only use subtitles in their native language.",
        options: ["True", "False"],
        correctAnswer: "False",
        explanation: "The video recommends gradually transitioning to target language subtitles.",
        points: 15
      }
    ],
    B1: [
      {
        id: "b1-1",
        type: "multiple-choice" as const,
        question: "What does the speaker mean by 'scaffolding' in language learning?",
        options: [
          "Building physical structures", 
          "Gradually reducing support as skills improve", 
          "Using only advanced materials", 
          "Avoiding all assistance"
        ],
        correctAnswer: "Gradually reducing support as skills improve",
        explanation: "Scaffolding refers to providing support that is gradually removed as learners become more independent.",
        points: 20
      },
      {
        id: "b1-2",
        type: "fill-blank" as const,
        question: "Complete this quote: 'Language acquisition is not a _____ process, but rather a _____ one that requires patience.'",
        correctAnswer: "linear, gradual",
        explanation: "The speaker emphasizes that language learning doesn't happen in a straight line but gradually over time.",
        points: 20
      },
      {
        id: "b1-3",
        type: "open-ended" as const,
        question: "Summarize the speaker's advice about dealing with difficult vocabulary in one sentence.",
        correctAnswer: "Focus on understanding general meaning rather than every single word",
        explanation: "The key is to develop tolerance for ambiguity and focus on overall comprehension.",
        points: 20
      }
    ],
    B2: [
      {
        id: "b2-1",
        type: "multiple-choice" as const,
        question: "The speaker's argument about motivation could be best described as:",
        options: [
          "Motivation is innate and cannot be changed",
          "External motivation is more effective than internal motivation",
          "Motivation fluctuates and requires cultivation",
          "Motivation is only important for beginners"
        ],
        correctAnswer: "Motivation fluctuates and requires cultivation",
        explanation: "The speaker discusses how motivation varies and needs to be actively maintained.",
        points: 25
      },
      {
        id: "b2-2",
        type: "open-ended" as const,
        question: "Analyze how the speaker's tone changes when discussing different learning strategies. What does this reveal about their perspective?",
        correctAnswer: "The tone becomes more enthusiastic when discussing active learning methods",
        explanation: "Notice the speaker's energy and emphasis when talking about interactive vs passive learning.",
        points: 25
      },
      {
        id: "b2-3",
        type: "fill-blank" as const,
        question: "The speaker uses the metaphor of language learning as a '_____' to illustrate the importance of regular practice.",
        correctAnswer: "journey",
        explanation: "The journey metaphor emphasizes the ongoing, gradual nature of language acquisition.",
        points: 25
      }
    ],
    C1: [
      {
        id: "c1-1",
        type: "open-ended" as const,
        question: "Critically evaluate the speaker's claim that 'authentic materials are always superior to textbook content.' What are the potential limitations of this approach?",
        correctAnswer: "While authentic materials provide real-world context, they may lack systematic progression and could overwhelm beginners",
        explanation: "A nuanced view considers both benefits and drawbacks of different material types.",
        points: 30
      },
      {
        id: "c1-2",
        type: "multiple-choice" as const,
        question: "The speaker's rhetorical strategy primarily relies on:",
        options: [
          "Statistical evidence and research citations",
          "Personal anecdotes and experiential learning",
          "Theoretical frameworks and academic discourse",
          "Emotional appeals and motivational language"
        ],
        correctAnswer: "Personal anecdotes and experiential learning",
        explanation: "The speaker frequently draws from personal experience to support their arguments.",
        points: 30
      },
      {
        id: "c1-3",
        type: "open-ended" as const,
        question: "How does the speaker's implicit bias toward technology-assisted learning affect the validity of their recommendations?",
        correctAnswer: "The bias may overlook traditional methods that could be effective for certain learning styles",
        explanation: "Critical analysis requires examining unstated assumptions and potential blind spots.",
        points: 30
      }
    ],
    C2: [
      {
        id: "c2-1",
        type: "open-ended" as const,
        question: "Deconstruct the speaker's argument structure and identify any logical fallacies or unsupported claims. How might these weaknesses affect the credibility of their overall message?",
        correctAnswer: "The argument relies heavily on anecdotal evidence and hasty generalizations, which may undermine claims about universal applicability",
        explanation: "Advanced analysis requires identifying specific logical structures and their limitations.",
        points: 35
      },
      {
        id: "c2-2",
        type: "open-ended" as const,
        question: "Synthesize the speaker's methodology with current second language acquisition theories. Where do you see convergence and divergence?",
        correctAnswer: "The approach aligns with Krashen's input hypothesis but diverges from skill-building theories by underemphasizing explicit instruction",
        explanation: "This requires deep knowledge of SLA theory and ability to make sophisticated connections.",
        points: 35
      },
      {
        id: "c2-3",
        type: "open-ended" as const,
        question: "Propose an alternative framework that addresses the limitations you've identified while preserving the strengths of the speaker's approach.",
        correctAnswer: "A hybrid model incorporating systematic progression with authentic materials, balanced explicit and implicit instruction",
        explanation: "Creating new frameworks demonstrates mastery-level understanding and creative application.",
        points: 35
      }
    ]
  };

  return baseExercises[level as keyof typeof baseExercises] || baseExercises.A1;
};

export function YouTubeExercises({ videoId, level, onBack, onComplete }: YouTubeExercisesProps) {
  const [exercises] = useState(() => generateExercises(videoId, level));
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const currentExercise = exercises[currentExerciseIndex];
  const progress = ((currentExerciseIndex + 1) / exercises.length) * 100;

  const levelInfo = {
    A1: { name: "Beginner", color: "bg-green-500" },
    A2: { name: "Elementary", color: "bg-green-600" },
    B1: { name: "Intermediate", color: "bg-warning" },
    B2: { name: "Upper-Intermediate", color: "bg-warning" },
    C1: { name: "Advanced", color: "bg-destructive" },
    C2: { name: "Proficiency", color: "bg-destructive" }
  };

  const handleAnswerChange = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentExercise.id]: value
    }));
  };

  const handleNext = () => {
    if (currentExerciseIndex < exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
    } else {
      // Calculate final score
      const totalScore = exercises.reduce((total, exercise) => {
        const userAnswer = answers[exercise.id];
        const isCorrect = userAnswer?.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
        return total + (isCorrect ? exercise.points : 0);
      }, 0);
      
      setScore(totalScore);
      setShowResults(true);
    }
  };

  const renderExercise = () => {
    const userAnswer = answers[currentExercise.id] || "";

    switch (currentExercise.type) {
      case "multiple-choice":
      case "true-false":
        return (
          <RadioGroup value={userAnswer} onValueChange={handleAnswerChange}>
            {currentExercise.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`} className="cursor-pointer">
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );

      case "fill-blank":
      case "open-ended":
        return (
          <Textarea
            placeholder="Type your answer here..."
            value={userAnswer}
            onChange={(e) => handleAnswerChange(e.target.value)}
            className="min-h-[100px]"
          />
        );

      default:
        return null;
    }
  };

  if (showResults) {
    const maxScore = exercises.reduce((total, exercise) => total + exercise.points, 0);
    const percentage = Math.round((score / maxScore) * 100);

    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Video
          </Button>
          
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="h-6 w-6 text-warning" />
              Exercise Results
            </h2>
          </div>
        </div>

        <Card className="text-center">
          <CardContent className="pt-6 space-y-6">
            <div className="flex justify-center">
              <div className="text-6xl font-bold text-primary">{percentage}%</div>
            </div>
            
            <div>
              <h3 className="text-xl font-semibold">Great Work!</h3>
              <p className="text-muted-foreground">
                You scored {score} out of {maxScore} points
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold">{exercises.length}</div>
                <div className="text-sm text-muted-foreground">Exercises</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{score}</div>
                <div className="text-sm text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <Badge className={`${levelInfo[level as keyof typeof levelInfo]?.color} text-white`}>
                  {level} Level
                </Badge>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <Button onClick={onComplete} className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Continue Learning
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle>Exercise Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {exercises.map((exercise, index) => {
              const userAnswer = answers[exercise.id] || "";
              const isCorrect = userAnswer.toLowerCase().trim() === exercise.correctAnswer.toLowerCase().trim();
              
              return (
                <div key={exercise.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {isCorrect ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium">Question {index + 1}</span>
                      </div>
                      <p className="text-sm mb-2">{exercise.question}</p>
                      <div className="text-xs space-y-1">
                        <div>Your answer: <span className={isCorrect ? "text-green-600" : "text-red-600"}>{userAnswer || "No answer"}</span></div>
                        <div>Correct answer: <span className="text-green-600">{exercise.correctAnswer}</span></div>
                        <div className="text-muted-foreground">{exercise.explanation}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {isCorrect ? exercise.points : 0}/{exercise.points} pts
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Video
        </Button>
        
        <div className="flex-1">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6" />
            YouTube Video Exercises
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge className={`${levelInfo[level as keyof typeof levelInfo]?.color} text-white`}>
              {level} - {levelInfo[level as keyof typeof levelInfo]?.name}
            </Badge>
            <Badge variant="outline">
              <Youtube className="h-3 w-3 mr-1" />
              Video: {videoId}
            </Badge>
          </div>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Exercise {currentExerciseIndex + 1} of {exercises.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        </CardContent>
      </Card>

      {/* Current Exercise */}
      <motion.div
        key={currentExercise.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Question {currentExerciseIndex + 1}</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-warning fill-warning" />
                <span className="text-sm font-normal">{currentExercise.points} points</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-lg leading-relaxed">{currentExercise.question}</p>
            </div>

            <div>
              {renderExercise()}
            </div>

            <div className="flex justify-between">
              <Button 
                variant="outline" 
                onClick={() => setCurrentExerciseIndex(Math.max(0, currentExerciseIndex - 1))}
                disabled={currentExerciseIndex === 0}
              >
                Previous
              </Button>
              
              <Button 
                onClick={handleNext}
                disabled={!answers[currentExercise.id]?.trim()}
              >
                {currentExerciseIndex === exercises.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}