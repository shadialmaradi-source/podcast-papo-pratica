import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  GripVertical,
  Target,
  Shuffle,
  Lightbulb,
  Clock,
  Star,
  Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdvancedExercise {
  id: string;
  type: "SentenceBuilding" | "TimelineOrdering" | "VisualErrorCorrection" | "MultiCategorization";
  question: string;
  items: string[];
  fragments?: string[];
  timeline?: { event: string; order: number }[];
  errors?: { text: string; errorIndex: number; correction: string }[];
  categories?: { name: string; color: string; items: string[] }[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
  hints?: string[];
  timeLimit?: number;
}

interface AdvancedExercisesProps {
  exercises: AdvancedExercise[];
  onComplete: (results: any[]) => void;
  onBack: () => void;
}

// Enhanced Draggable Item with visual feedback
interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isCorrect?: boolean;
  isIncorrect?: boolean;
}

const DraggableItem = ({ id, children, className = "", isCorrect, isIncorrect }: DraggableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        drag-item cursor-grab active:cursor-grabbing
        ${isDragging ? 'drag-item--dragging' : ''}
        ${isCorrect ? 'exercise-feedback--correct' : ''}
        ${isIncorrect ? 'exercise-feedback--incorrect' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Enhanced Drop Zone with visual states
interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOver?: boolean;
  isActive?: boolean;
  category?: string;
}

const DropZone = ({ id, children, className = "", isOver = false, isActive = false, category }: DropZoneProps) => {
  return (
    <div
      className={`
        drop-zone min-h-[60px] border-2 border-dashed rounded-lg p-3
        ${isActive ? 'drop-zone--active' : ''}
        ${isOver ? 'drop-zone--over' : 'border-muted-foreground/30'}
        ${className}
      `}
    >
      {category && (
        <div className="text-xs font-medium text-muted-foreground mb-2">
          {category}
        </div>
      )}
      {children}
    </div>
  );
};

// Hint System Component
interface HintSystemProps {
  hints: string[];
  currentHint: number;
  onNextHint: () => void;
  visible: boolean;
}

const HintSystem = ({ hints, currentHint, onNextHint, visible }: HintSystemProps) => {
  if (!visible || hints.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="hint-system hint-system--visible bg-accent/20 border border-accent rounded-lg p-4 mt-4"
    >
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-medium text-accent-foreground">
            Hint {currentHint + 1} of {hints.length}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {hints[currentHint]}
          </p>
          {currentHint < hints.length - 1 && (
            <Button 
              onClick={onNextHint} 
              variant="outline" 
              size="sm" 
              className="mt-2"
            >
              Next Hint
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// Timer Component
interface TimerProps {
  timeLimit: number;
  onTimeUp: () => void;
}

const Timer = ({ timeLimit, onTimeUp }: TimerProps) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  useState(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          onTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  });

  const progress = (timeLeft / timeLimit) * 100;

  return (
    <div className="flex items-center gap-3">
      <Clock className="h-4 w-4" />
      <div className="flex-1">
        <Progress value={progress} className="h-2" />
      </div>
      <span className="text-sm font-medium">
        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
      </span>
    </div>
  );
};

export const AdvancedExercises = ({ exercises, onComplete, onBack }: AdvancedExercisesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [showHints, setShowHints] = useState(false);
  const [currentHint, setCurrentHint] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const [celebration, setCelebration] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const currentExercise = exercises[currentIndex];
  const progress = ((currentIndex + 1) / exercises.length) * 100;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    setDragOverId(event.over?.id as string || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setDragOverId(null);

    if (!over || !currentExercise) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle different exercise types
    switch (currentExercise.type) {
      case "SentenceBuilding":
        handleSentenceBuildingDragEnd(activeId, overId);
        break;
      case "TimelineOrdering":
        handleTimelineOrderingDragEnd(activeId, overId);
        break;
      case "MultiCategorization":
        handleMultiCategorizationDragEnd(activeId, overId);
        break;
    }
  };

  const handleSentenceBuildingDragEnd = (activeId: string, overId: string) => {
    const currentOrder = userAnswers[currentExercise.id] || [...(currentExercise.fragments || [])];
    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      setUserAnswers(prev => ({
        ...prev,
        [currentExercise.id]: newOrder
      }));
    }
  };

  const handleTimelineOrderingDragEnd = (activeId: string, overId: string) => {
    const currentOrder = userAnswers[currentExercise.id] || currentExercise.timeline?.map(t => t.event) || [];
    const oldIndex = currentOrder.indexOf(activeId);
    const newIndex = currentOrder.indexOf(overId);

    if (oldIndex !== newIndex) {
      const newOrder = arrayMove(currentOrder, oldIndex, newIndex);
      setUserAnswers(prev => ({
        ...prev,
        [currentExercise.id]: newOrder
      }));
    }
  };

  const handleMultiCategorizationDragEnd = (activeId: string, overId: string) => {
    const currentCategories = userAnswers[currentExercise.id] || {};
    
    // Remove from previous category
    Object.keys(currentCategories).forEach(category => {
      if (currentCategories[category].includes(activeId)) {
        currentCategories[category] = currentCategories[category].filter((item: string) => item !== activeId);
      }
    });

    // Add to new category
    if (!currentCategories[overId]) {
      currentCategories[overId] = [];
    }
    currentCategories[overId].push(activeId);

    setUserAnswers(prev => ({
      ...prev,
      [currentExercise.id]: currentCategories
    }));
  };

  const handleSubmit = () => {
    if (!currentExercise || timeUp) return;

    const userAnswer = userAnswers[currentExercise.id];
    let correct = false;

    // Check answer based on exercise type
    switch (currentExercise.type) {
      case "SentenceBuilding":
      case "TimelineOrdering":
        const correctOrder = JSON.parse(currentExercise.correctAnswer);
        correct = JSON.stringify(userAnswer) === JSON.stringify(correctOrder);
        break;
      case "MultiCategorization":
        const correctCategories = JSON.parse(currentExercise.correctAnswer);
        correct = JSON.stringify(userAnswer) === JSON.stringify(correctCategories);
        break;
    }

    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      setCelebration(true);
      setTimeout(() => setCelebration(false), 1500);
    }

    const result = {
      exerciseId: currentExercise.id,
      userAnswer: userAnswer,
      isCorrect: correct,
      timeSpent: Date.now(),
      points: correct ? currentExercise.points : 0,
      hintsUsed: currentHint + (showHints ? 1 : 0)
    };

    setResults(prev => [...prev, result]);

    toast({
      title: correct ? "Excellent!" : "Keep practicing",
      description: correct ? `+${currentExercise.points} XP` : "Try again next time",
      variant: correct ? "default" : "destructive",
    });
  };

  const handleNext = () => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setShowResult(false);
      setShowHints(false);
      setCurrentHint(0);
      setTimeUp(false);
    } else {
      onComplete(results);
    }
  };

  const showHint = () => {
    setShowHints(true);
  };

  const nextHint = () => {
    if (currentExercise?.hints && currentHint < currentExercise.hints.length - 1) {
      setCurrentHint(prev => prev + 1);
    }
  };

  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    const userAnswer = userAnswers[currentExercise.id];

    switch (currentExercise.type) {
      case "SentenceBuilding":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
              </div>

              <SortableContext items={userAnswer || currentExercise.fragments || []} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-3 justify-center min-h-[80px] p-4 bg-muted/30 rounded-lg">
                  {(userAnswer || currentExercise.fragments || []).map((fragment: string) => (
                    <DraggableItem key={fragment} id={fragment}>
                      <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                        {fragment}
                      </div>
                    </DraggableItem>
                  ))}
                </div>
              </SortableContext>

              <div className="text-center">
                <div className="p-4 bg-card border rounded-lg">
                  <p className="text-lg font-medium">
                    {(userAnswer || currentExercise.fragments || []).join(' ')}
                  </p>
                </div>
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="px-4 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg">
                    {activeId}
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        );

      case "TimelineOrdering":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
              </div>

              <SortableContext items={userAnswer || currentExercise.timeline?.map(t => t.event) || []} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {(userAnswer || currentExercise.timeline?.map(t => t.event) || []).map((event: string, index: number) => (
                    <DraggableItem key={event} id={event}>
                      <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
                        <Badge variant="outline" className="min-w-[2rem]">{index + 1}</Badge>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{event}</span>
                      </div>
                    </DraggableItem>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId ? (
                  <div className="flex items-center gap-4 p-4 bg-card border rounded-lg shadow-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span>{activeId}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        );

      case "MultiCategorization":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
              </div>

              {/* Items to categorize */}
              <div className="space-y-3">
                <h3 className="font-semibold">Items to categorize:</h3>
                <div className="flex flex-wrap gap-3">
                  {currentExercise.items.map((item) => {
                    // Check if item is already categorized
                    const isInCategory = userAnswer && Object.values(userAnswer).some((categoryItems: any) => 
                      Array.isArray(categoryItems) && categoryItems.includes(item)
                    );
                    
                    if (isInCategory) return null;
                    
                    return (
                      <DraggableItem key={item} id={item}>
                        <div className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg">
                          {item}
                        </div>
                      </DraggableItem>
                    );
                  })}
                </div>
              </div>

              {/* Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentExercise.categories?.map((category) => (
                  <DropZone 
                    key={category.name} 
                    id={category.name}
                    category={category.name}
                    isOver={dragOverId === category.name}
                    className={`bg-${category.color}/10 border-${category.color}/30`}
                  >
                    <div className="space-y-2">
                      {userAnswer?.[category.name]?.map((item: string) => (
                        <div key={item} className="px-2 py-1 bg-card border rounded text-sm">
                          {item}
                        </div>
                      ))}
                    </div>
                  </DropZone>
                ))}
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="px-3 py-2 bg-secondary text-secondary-foreground rounded-lg shadow-lg">
                    {activeId}
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        );

      default:
        return (
          <div className="text-center">
            <p>Exercise type not implemented: {currentExercise.type}</p>
          </div>
        );
    }
  };

  if (!currentExercise) {
    return (
      <div className="text-center p-8">
        <p>No exercises available</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header with enhanced information */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {currentIndex + 1} / {exercises.length}
          </Badge>
          <Badge variant="secondary">
            {currentExercise.type}
          </Badge>
          <Badge variant="outline">
            {currentExercise.difficulty}
          </Badge>
          {celebration && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="celebration"
            >
              <Trophy className="h-6 w-6 text-accent" />
            </motion.div>
          )}
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            <span className="text-sm">{currentExercise.points} pts</span>
          </div>
          {currentExercise.timeLimit && !showResult && (
            <Timer timeLimit={currentExercise.timeLimit} onTimeUp={() => setTimeUp(true)} />
          )}
        </div>
      </div>

      {/* Enhanced Progress */}
      <div className="space-y-2">
        <Progress value={progress} className="h-3 progress-celebration" />
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Exercise Content */}
      <motion.div
        key={currentIndex}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
      >
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {currentExercise.type.replace(/([A-Z])/g, ' $1').trim()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {renderExerciseContent()}
            
            {/* Hint System */}
            <AnimatePresence>
              {showHints && currentExercise.hints && (
                <HintSystem 
                  hints={currentExercise.hints}
                  currentHint={currentHint}
                  onNextHint={nextHint}
                  visible={showHints}
                />
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Enhanced Action Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {!showResult && !timeUp && currentExercise.hints && !showHints && (
            <Button onClick={showHint} variant="outline" size="sm">
              <Lightbulb className="h-4 w-4 mr-2" />
              Hint
            </Button>
          )}
          <Button onClick={onBack} variant="outline">
            Back
          </Button>
        </div>

        <div className="flex gap-2">
          {!showResult && !timeUp && (
            <Button onClick={handleSubmit} className="min-w-[100px]">
              Submit
            </Button>
          )}
          
          {(showResult || timeUp) && (
            <Button onClick={handleNext} className="min-w-[100px]">
              {currentIndex === exercises.length - 1 ? 'Complete' : 'Next'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>

      {/* Result Display */}
      <AnimatePresence>
        {(showResult || timeUp) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`exercise-feedback rounded-lg p-4 border-2 ${
              isCorrect && !timeUp ? 'exercise-feedback--correct' : 'exercise-feedback--incorrect'
            }`}
          >
            <div className="flex items-center gap-3">
              {timeUp ? (
                <Clock className="h-6 w-6 text-warning" />
              ) : isCorrect ? (
                <CheckCircle className="h-6 w-6 text-success" />
              ) : (
                <XCircle className="h-6 w-6 text-destructive" />
              )}
              
              <div className="flex-1">
                <p className="font-semibold">
                  {timeUp ? "Time's up!" : isCorrect ? "Correct!" : "Incorrect"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {currentExercise.explanation}
                </p>
              </div>
              
              {isCorrect && !timeUp && (
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-accent" />
                    <span className="font-semibold">+{currentExercise.points} XP</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};