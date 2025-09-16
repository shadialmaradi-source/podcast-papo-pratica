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
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
  SortableContext as SortableContextType,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  XCircle, 
  ArrowRight,
  GripVertical,
  Target,
  Shuffle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface DragDropExercise {
  id: string;
  type: "DragDropMatching" | "DragDropSequencing" | "DragDropCategorization" | "DragDropWordOrder";
  question: string;
  items: string[];
  targets?: string[];
  categories?: { name: string; items: string[] }[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
}

interface DragDropExercisesProps {
  exercises: DragDropExercise[];
  onComplete: (results: any[]) => void;
  onBack: () => void;
}

// Draggable Item Component
interface DraggableItemProps {
  id: string;
  children: React.ReactNode;
  className?: string;
}

const DraggableItem = ({ id, children, className = "" }: DraggableItemProps) => {
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
        cursor-grab active:cursor-grabbing
        ${isDragging ? 'opacity-50 z-50' : 'opacity-100'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Drop Zone Component
interface DropZoneProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isOver?: boolean;
}

const DropZone = ({ id, children, className = "", isOver = false }: DropZoneProps) => {
  return (
    <div
      className={`
        min-h-[60px] border-2 border-dashed rounded-lg p-3 transition-all duration-200
        ${isOver ? 'border-primary bg-primary/10' : 'border-muted-foreground/30'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const DragDropExercises = ({ exercises, onComplete, onBack }: DragDropExercisesProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || !currentExercise) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Handle different exercise types
    switch (currentExercise.type) {
      case "DragDropSequencing":
        handleSequencingDragEnd(activeId, overId);
        break;
      case "DragDropMatching":
        handleMatchingDragEnd(activeId, overId);
        break;
      case "DragDropCategorization":
        handleCategorizationDragEnd(activeId, overId);
        break;
      case "DragDropWordOrder":
        handleWordOrderDragEnd(activeId, overId);
        break;
    }
  };

  const handleSequencingDragEnd = (activeId: string, overId: string) => {
    const currentOrder = userAnswers[currentExercise.id] || [...currentExercise.items];
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

  const handleMatchingDragEnd = (activeId: string, overId: string) => {
    const currentMatches = userAnswers[currentExercise.id] || {};
    setUserAnswers(prev => ({
      ...prev,
      [currentExercise.id]: {
        ...currentMatches,
        [activeId]: overId
      }
    }));
  };

  const handleCategorizationDragEnd = (activeId: string, overId: string) => {
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

  const handleWordOrderDragEnd = (activeId: string, overId: string) => {
    const currentOrder = userAnswers[currentExercise.id] || [...currentExercise.items];
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

  const handleSubmit = () => {
    if (!currentExercise) return;

    const userAnswer = userAnswers[currentExercise.id];
    let correct = false;

    // Check answer based on exercise type
    switch (currentExercise.type) {
      case "DragDropSequencing":
      case "DragDropWordOrder":
        const correctOrder = JSON.parse(currentExercise.correctAnswer);
        correct = JSON.stringify(userAnswer) === JSON.stringify(correctOrder);
        break;
      case "DragDropMatching":
        const correctMatches = JSON.parse(currentExercise.correctAnswer);
        correct = JSON.stringify(userAnswer) === JSON.stringify(correctMatches);
        break;
      case "DragDropCategorization":
        const correctCategories = JSON.parse(currentExercise.correctAnswer);
        correct = JSON.stringify(userAnswer) === JSON.stringify(correctCategories);
        break;
    }

    setIsCorrect(correct);
    setShowResult(true);

    const result = {
      exerciseId: currentExercise.id,
      userAnswer: userAnswer,
      isCorrect: correct,
      timeSpent: Date.now(),
      points: correct ? currentExercise.points : 0
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
    } else {
      onComplete(results);
    }
  };

  const shuffle = () => {
    if (!currentExercise) return;
    
    const shuffled = [...currentExercise.items].sort(() => Math.random() - 0.5);
    setUserAnswers(prev => ({
      ...prev,
      [currentExercise.id]: shuffled
    }));
  };

  const renderExerciseContent = () => {
    if (!currentExercise) return null;

    const userAnswer = userAnswers[currentExercise.id];

    switch (currentExercise.type) {
      case "DragDropSequencing":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
                <Button onClick={shuffle} variant="outline" size="sm">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle
                </Button>
              </div>

              <SortableContext items={userAnswer || currentExercise.items} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {(userAnswer || currentExercise.items).map((item: string, index: number) => (
                    <DraggableItem key={item} id={item}>
                      <div className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-md transition-shadow">
                        <Badge variant="outline">{index + 1}</Badge>
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1">{item}</span>
                      </div>
                    </DraggableItem>
                  ))}
                </div>
              </SortableContext>

              <DragOverlay>
                {activeId ? (
                  <div className="flex items-center gap-3 p-4 bg-card border rounded-lg shadow-lg">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <span>{activeId}</span>
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        );

      case "DragDropMatching":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Terms */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-center">Terms</h3>
                  {currentExercise.items.slice(0, currentExercise.items.length / 2).map((item) => (
                    <DraggableItem key={item} id={item}>
                      <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-center hover:bg-primary/20 transition-colors">
                        {item}
                      </div>
                    </DraggableItem>
                  ))}
                </div>

                {/* Definitions */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-center">Definitions</h3>
                  {currentExercise.targets?.map((target) => (
                    <DropZone key={target} id={target}>
                      <div className="min-h-[60px] flex items-center justify-center text-center">
                        {userAnswer?.[Object.keys(userAnswer).find(key => userAnswer[key] === target) || ''] || target}
                      </div>
                    </DropZone>
                  ))}
                </div>
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg shadow-lg">
                    {activeId}
                  </div>
                ) : null}
              </DragOverlay>
            </div>
          </DndContext>
        );

      case "DragDropWordOrder":
        return (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-lg mb-4">{currentExercise.question}</p>
                <Button onClick={shuffle} variant="outline" size="sm">
                  <Shuffle className="h-4 w-4 mr-2" />
                  Shuffle
                </Button>
              </div>

              <SortableContext items={userAnswer || currentExercise.items} strategy={horizontalListSortingStrategy}>
                <div className="flex flex-wrap gap-3 justify-center">
                  {(userAnswer || currentExercise.items).map((word: string) => (
                    <DraggableItem key={word} id={word}>
                      <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors">
                        {word}
                      </div>
                    </DraggableItem>
                  ))}
                </div>
              </SortableContext>

              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Drag the words to form a correct sentence
                </p>
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-lg">
                    {(userAnswer || currentExercise.items).join(' ')}
                  </p>
                </div>
              </div>

              <DragOverlay>
                {activeId ? (
                  <div className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg shadow-lg">
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {currentIndex + 1} / {exercises.length}
          </Badge>
          <Badge variant="secondary">
            {currentExercise.type.replace('DragDrop', '')}
          </Badge>
          <Badge variant="outline">
            {currentExercise.difficulty}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="text-sm">{currentExercise.points} pts</span>
        </div>
      </div>

      {/* Progress */}
      <div className="w-full bg-secondary rounded-full h-2">
        <div 
          className="bg-primary h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
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
              {currentExercise.type.replace('DragDrop', '')} Exercise
            </CardTitle>
          </CardHeader>

          <CardContent>
            {renderExerciseContent()}

            {/* Action Buttons */}
            <div className="flex justify-center mt-8">
              {!showResult ? (
                <Button 
                  onClick={handleSubmit}
                  disabled={!userAnswers[currentExercise.id]}
                  size="lg"
                  className="px-8"
                >
                  Submit Answer
                </Button>
              ) : (
                <div className="text-center space-y-4">
                  <div className={`flex items-center justify-center gap-2 ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <XCircle className="h-6 w-6" />
                    )}
                    <span className="font-medium">
                      {isCorrect ? 'Perfect!' : 'Keep practicing!'}
                    </span>
                  </div>

                  {currentExercise.explanation && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm">{currentExercise.explanation}</p>
                    </div>
                  )}

                  <Button onClick={handleNext} size="lg">
                    {currentIndex < exercises.length - 1 ? 'Next Exercise' : 'Complete'}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};