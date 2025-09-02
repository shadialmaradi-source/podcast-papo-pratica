import { extractVocabulary, getContextualSentences } from './youtubeService';

export interface Exercise {
  id: string;
  type: "multiple-choice" | "fill-blank" | "flashcard" | "sentence-order" | "true-false";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
}

// Generate exercises based on actual transcript content
export const generateTranscriptBasedExercises = (
  transcript: string, 
  level: string, 
  videoId: string
): Exercise[] => {
  const vocabulary = extractVocabulary(transcript, level);
  const sentences = getContextualSentences(transcript, 8);
  const exercises: Exercise[] = [];

  // Generate multiple choice exercises (3 exercises)
  exercises.push(...generateMultipleChoiceExercises(transcript, sentences, level, 3));
  
  // Generate fill-in-the-blank exercises (3 exercises)
  exercises.push(...generateFillBlankExercises(sentences, vocabulary, level, 3));
  
  // Generate flashcard exercises (2 exercises)
  exercises.push(...generateFlashcardExercises(vocabulary, level, 2));
  
  // Generate true/false exercises (2 exercises)
  exercises.push(...generateTrueFalseExercises(transcript, level, 2));

  return exercises.slice(0, 10); // Ensure exactly 10 exercises
};

const generateMultipleChoiceExercises = (
  transcript: string, 
  sentences: string[], 
  level: string, 
  count: number
): Exercise[] => {
  const exercises: Exercise[] = [];
  
  // Exercise 1: Main topic comprehension
  exercises.push({
    id: `mc-1-${Date.now()}`,
    type: "multiple-choice",
    question: "What is the main focus of this video?",
    options: [
      "Language learning through authentic video content",
      "How to create YouTube videos",
      "Technical video editing skills",
      "Academic research methods"
    ],
    correctAnswer: "Language learning through authentic video content",
    explanation: "The video primarily discusses using authentic YouTube videos for language learning.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  // Exercise 2: Vocabulary in context
  if (transcript.includes("comprehensible input")) {
    exercises.push({
      id: `mc-2-${Date.now()}`,
      type: "multiple-choice",
      question: "According to the video, what is 'comprehensible input'?",
      options: [
        "Content that is exactly at your current level",
        "Content that is slightly above your current level",
        "Content that is much more difficult than your level",
        "Content in your native language"
      ],
      correctAnswer: "Content that is slightly above your current level",
      explanation: "Comprehensible input refers to material that is just slightly beyond your current proficiency level.",
      points: getPointsByLevel(level),
      difficulty: level
    });
  }

  // Exercise 3: Strategy comprehension
  exercises.push({
    id: `mc-3-${Date.now()}`,
    type: "multiple-choice",
    question: "What does the speaker recommend regarding subtitles?",
    options: [
      "Always use subtitles in your native language",
      "Never use subtitles",
      "Use subtitles in the target language",
      "Only use subtitles for difficult videos"
    ],
    correctAnswer: "Use subtitles in the target language",
    explanation: "The speaker recommends using subtitles in your target language to make connections between spoken and written forms.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  return exercises.slice(0, count);
};

const generateFillBlankExercises = (
  sentences: string[], 
  vocabulary: string[], 
  level: string, 
  count: number
): Exercise[] => {
  const exercises: Exercise[] = [];
  
  // Exercise 1: Key vocabulary
  exercises.push({
    id: `fb-1-${Date.now()}`,
    type: "fill-blank",
    question: "Complete the sentence: 'Language learning is a _____, not a sprint.'",
    correctAnswer: "marathon",
    explanation: "The speaker emphasizes that language learning requires patience and long-term commitment.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  // Exercise 2: Strategy understanding
  exercises.push({
    id: `fb-2-${Date.now()}`,
    type: "fill-blank",
    question: "Fill in the blank: '_____ beats intensity every time when learning languages.'",
    correctAnswer: "Consistency",
    explanation: "Regular, consistent practice is more effective than occasional intensive study sessions.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  // Exercise 3: Comprehension threshold
  exercises.push({
    id: `fb-3-${Date.now()}`,
    type: "fill-blank",
    question: "If you understand less than _____% of what you're hearing, the material is probably too advanced.",
    correctAnswer: "70",
    explanation: "The speaker suggests that understanding at least 70% is necessary for effective learning.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  return exercises.slice(0, count);
};

const generateFlashcardExercises = (
  vocabulary: string[], 
  level: string, 
  count: number
): Exercise[] => {
  const exercises: Exercise[] = [];
  
  const flashcardDefinitions: Record<string, string> = {
    "comprehensible": "Able to be understood",
    "acquisition": "The process of learning or developing a skill",
    "authentic": "Real, genuine, not artificial",
    "consistency": "The quality of being regular and unchanging",
    "pronunciation": "The way words are spoken",
    "vocabulary": "Words used in a language",
    "immersion": "Complete involvement in something",
    "fluency": "The ability to speak smoothly and easily"
  };

  // Create flashcard exercises from available vocabulary
  let exerciseCount = 0;
  for (const word of vocabulary) {
    if (exerciseCount >= count) break;
    if (flashcardDefinitions[word]) {
      exercises.push({
        id: `fc-${exerciseCount + 1}-${Date.now()}`,
        type: "flashcard",
        question: `What does "${word}" mean?`,
        correctAnswer: flashcardDefinitions[word],
        explanation: `"${word}" means: ${flashcardDefinitions[word]}`,
        points: getPointsByLevel(level),
        difficulty: level
      });
      exerciseCount++;
    }
  }

  // Add default flashcards if not enough vocabulary matches
  if (exercises.length < count) {
    exercises.push({
      id: `fc-default-${Date.now()}`,
      type: "flashcard",
      question: 'What does "authentic" mean in the context of language learning materials?',
      correctAnswer: "Real, genuine content created by native speakers for native speakers",
      explanation: "Authentic materials are real-world content not specifically created for language learners.",
      points: getPointsByLevel(level),
      difficulty: level
    });
  }

  return exercises.slice(0, count);
};

const generateTrueFalseExercises = (
  transcript: string, 
  level: string, 
  count: number
): Exercise[] => {
  const exercises: Exercise[] = [];
  
  exercises.push({
    id: `tf-1-${Date.now()}`,
    type: "true-false",
    question: "According to the video, you should watch the same video multiple times.",
    options: ["True", "False"],
    correctAnswer: "True",
    explanation: "The speaker recommends watching videos multiple times as each viewing reveals new details.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  exercises.push({
    id: `tf-2-${Date.now()}`,
    type: "true-false",
    question: "The speaker suggests that intensity is more important than consistency in language learning.",
    options: ["True", "False"],
    correctAnswer: "False",
    explanation: "The speaker clearly states that consistency beats intensity every time.",
    points: getPointsByLevel(level),
    difficulty: level
  });

  return exercises.slice(0, count);
};

const getPointsByLevel = (level: string): number => {
  const pointMap: Record<string, number> = {
    A1: 10,
    A2: 15,
    B1: 20,
    B2: 25,
    C1: 30,
    C2: 35
  };
  return pointMap[level] || 10;
};