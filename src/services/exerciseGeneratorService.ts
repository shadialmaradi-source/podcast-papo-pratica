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
  const exercises: Exercise[] = [];

  // Generate multiple choice exercises (3 exercises)
  exercises.push(...generateMultipleChoiceExercises(transcript, level, videoId));
  
  // Generate fill-in-the-blank exercises (3 exercises)
  exercises.push(...generateFillBlankExercises(transcript, level, videoId));
  
  // Generate flashcard exercises (2 exercises)
  exercises.push(...generateFlashcardExercises(transcript, level, videoId));
  
  // Generate true/false exercises (2 exercises)
  exercises.push(...generateTrueFalseExercises(transcript, level, videoId));

  return exercises.slice(0, 10); // Ensure exactly 10 exercises
};

// Generate multiple choice exercises
const generateMultipleChoiceExercises = (transcript: string, level: string, videoId: string): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 10);
  const vocabulary = extractVocabulary(transcript, level);
  
  if (sentences.length === 0) return exercises;

  // Exercise 1: Main topic comprehension based on actual content
  const firstSentence = sentences[0];
  const topics = extractTopicsFromTranscript(transcript);
  const mainTopic = topics[0] || 'the main topic';
  
  exercises.push({
    id: `mc-1-${videoId}`,
    type: 'multiple-choice',
    question: `What is the main topic discussed in this video?`,
    options: [
      mainTopic,
      'Cooking recipes',
      'Sports training',
      'Computer programming'
    ],
    correctAnswer: mainTopic,
    explanation: `The video primarily discusses ${mainTopic.toLowerCase()}.`,
    points: getPointsByLevel(level),
    difficulty: level
  });

  // Exercise 2: Vocabulary in context from actual transcript
  if (vocabulary.length > 0) {
    const word = vocabulary[0];
    const sentenceWithWord = sentences.find(s => s.toLowerCase().includes(word.toLowerCase()));
    
    if (sentenceWithWord) {
      exercises.push({
        id: `mc-2-${videoId}`,
        type: 'multiple-choice',
        question: `In the context "${sentenceWithWord.substring(0, 80)}...", what does "${word}" most likely mean?`,
        options: [
          generateDefinition(word, sentenceWithWord),
          'Something completely unrelated',
          'A type of food',
          'A place or location'
        ],
        correctAnswer: generateDefinition(word, sentenceWithWord),
        explanation: `Based on the context, "${word}" refers to ${generateDefinition(word, sentenceWithWord).toLowerCase()}.`,
        points: getPointsByLevel(level),
        difficulty: level
      });
    }
  }

  // Exercise 3: Content comprehension from transcript
  if (sentences.length > 2) {
    const randomSentence = sentences[Math.floor(Math.random() * Math.min(3, sentences.length))];
    exercises.push({
      id: `mc-3-${videoId}`,
      type: 'multiple-choice',
      question: 'Which statement is mentioned in the video?',
      options: [
        randomSentence.substring(0, 60) + '...',
        'The weather is always sunny',
        'Cats are better than dogs',
        'Pizza is the best food'
      ],
      correctAnswer: randomSentence.substring(0, 60) + '...',
      explanation: 'This statement was directly mentioned in the video transcript.',
      points: getPointsByLevel(level),
      difficulty: level
    });
  }

  return exercises;
};

// Generate fill in the blank exercises
const generateFillBlankExercises = (transcript: string, level: string, videoId: string): Exercise[] => {
  const exercises: Exercise[] = [];
  const vocabulary = extractVocabulary(transcript, level);
  const sentences = getContextualSentences(transcript, 8);
  
  if (sentences.length === 0) return exercises;

  // Find sentences with key vocabulary words to create blanks
  for (let i = 0; i < Math.min(3, sentences.length); i++) {
    const sentence = sentences[i];
    const words = sentence.split(' ');
    
    // Find a good word to remove (not too short, not a common word)
    const targetWord = words.find(word => 
      word.length > 4 && 
      !['that', 'this', 'they', 'with', 'from', 'have', 'will', 'when', 'what', 'where'].includes(word.toLowerCase()) &&
      /^[a-zA-Z]+$/.test(word)
    );

    if (targetWord) {
      const blankSentence = sentence.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '______');
      
      exercises.push({
        id: `fill-${i + 1}-${videoId}`,
        type: 'fill-blank',
        question: `Fill in the blank: "${blankSentence}"`,
        options: [],
        correctAnswer: targetWord.toLowerCase().replace(/[^\w]/g, ''),
        explanation: `The word "${targetWord}" fits the context of the sentence from the video.`,
        points: getPointsByLevel(level),
        difficulty: level
      });
    }
  }

  // If we couldn't generate enough exercises, add a simple vocabulary one
  if (exercises.length === 0 && vocabulary.length > 0) {
    const word = vocabulary[0];
    exercises.push({
      id: `fill-vocab-${videoId}`,
      type: 'fill-blank',
      question: `Complete with a word from the video: "The video discusses many important _____."`,
      options: [],
      correctAnswer: word,
      explanation: `"${word}" is a key term mentioned in the video.`,
      points: getPointsByLevel(level),
      difficulty: level
    });
  }

  return exercises;
};

// Generate flashcard exercises
const generateFlashcardExercises = (transcript: string, level: string, videoId: string): Exercise[] => {
  const exercises: Exercise[] = [];
  const vocabulary = extractVocabulary(transcript, level);
  
  if (vocabulary.length === 0) return exercises;

  // Create flashcards for actual vocabulary from the transcript
  vocabulary.slice(0, 3).forEach((term, index) => {
    // Find context sentence for the term
    const sentences = getContextualSentences(transcript, 20);
    const contextSentence = sentences.find(s => s.toLowerCase().includes(term.toLowerCase()));
    
    const definition = generateDefinition(term, contextSentence || '');
    
    exercises.push({
      id: `flash-${index + 1}-${videoId}`,
      type: 'flashcard',
      question: `What does "${term}" mean in the context of this video?`,
      options: [],
      correctAnswer: definition,
      explanation: contextSentence ? 
        `From the video: "${contextSentence.substring(0, 100)}..."` : 
        `"${term}" is a key concept discussed in the video.`,
      points: getPointsByLevel(level),
      difficulty: level
    });
  });

  return exercises;
};

// Generate true/false exercises
const generateTrueFalseExercises = (transcript: string, level: string, videoId: string): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 10);
  
  if (sentences.length === 0) return exercises;

  // Create true statements from actual transcript content
  const trueStatements = sentences.slice(0, 2).map(sentence => ({
    statement: sentence.length > 100 ? sentence.substring(0, 100) + '...' : sentence,
    answer: 'true',
    explanation: 'This statement is directly mentioned in the video.'
  }));

  // Create false statements by modifying transcript content
  const falseStatements = [
    {
      statement: 'The video is about cooking recipes.',
      answer: 'false',
      explanation: 'This is not what the video discusses based on the transcript.'
    }
  ];

  // Add true statements
  trueStatements.forEach((q, index) => {
    exercises.push({
      id: `tf-true-${index + 1}-${videoId}`,
      type: 'true-false',
      question: `True or False: ${q.statement}`,
      options: ['True', 'False'],
      correctAnswer: 'True',
      explanation: q.explanation,
      points: getPointsByLevel(level),
      difficulty: level
    });
  });

  // Add one false statement
  exercises.push({
    id: `tf-false-1-${videoId}`,
    type: 'true-false',
    question: `True or False: ${falseStatements[0].statement}`,
    options: ['True', 'False'],
    correctAnswer: 'False',
    explanation: falseStatements[0].explanation,
    points: getPointsByLevel(level),
    difficulty: level
  });

  return exercises;
};

// Helper function to determine points by level
const getPointsByLevel = (level: string): number => {
  const pointsMap = {
    A1: 10, A2: 15, B1: 20, B2: 25, C1: 30, C2: 35
  };
  return pointsMap[level as keyof typeof pointsMap] || 10;
};

// Helper function to extract topics from transcript
const extractTopicsFromTranscript = (transcript: string): string[] => {
  const text = transcript.toLowerCase();
  const topics = [];
  
  // Look for common topic indicators
  if (text.includes('language') && text.includes('learn')) topics.push('Language learning');
  if (text.includes('cooking') || text.includes('recipe')) topics.push('Cooking');
  if (text.includes('technology') || text.includes('computer')) topics.push('Technology');
  if (text.includes('business') || text.includes('marketing')) topics.push('Business');
  if (text.includes('health') || text.includes('fitness')) topics.push('Health and fitness');
  if (text.includes('science') || text.includes('research')) topics.push('Science');
  if (text.includes('history') || text.includes('historical')) topics.push('History');
  if (text.includes('travel') || text.includes('culture')) topics.push('Travel and culture');
  
  // If no specific topics found, extract first few meaningful words
  if (topics.length === 0) {
    const words = transcript.split(' ').slice(0, 20);
    const meaningfulWords = words.filter(word => 
      word.length > 4 && 
      !['that', 'this', 'they', 'with', 'from', 'have', 'will', 'when', 'what', 'where', 'today', 'going'].includes(word.toLowerCase())
    );
    if (meaningfulWords.length > 0) {
      topics.push(meaningfulWords.slice(0, 2).join(' and '));
    }
  }
  
  return topics.length > 0 ? topics : ['General topics'];
};

// Helper function to generate contextual definitions
const generateDefinition = (word: string, context: string): string => {
  const word_lower = word.toLowerCase();
  
  // Basic definitions for common words
  const definitions: Record<string, string> = {
    'learning': 'the process of acquiring knowledge or skills',
    'language': 'a system of communication used by people',
    'content': 'material or information presented',
    'video': 'recorded moving images with sound',
    'practice': 'repeated exercise to improve skill',
    'study': 'learning about a subject in detail',
    'method': 'a particular way of doing something',
    'strategy': 'a plan of action to achieve a goal',
    'skill': 'the ability to do something well',
    'improve': 'to make or become better',
    'understand': 'to grasp the meaning of something',
    'effective': 'successful in producing a desired result',
    'important': 'of great significance or value',
    'natural': 'existing in nature; not artificial',
    'create': 'to bring something into existence'
  };
  
  if (definitions[word_lower]) {
    return definitions[word_lower];
  }
  
  // If context is provided, try to infer meaning
  if (context && context.includes(word)) {
    if (context.includes('improve') || context.includes('better')) {
      return 'something that helps improve or enhance';
    }
    if (context.includes('method') || context.includes('way')) {
      return 'a method or approach';
    }
    if (context.includes('important') || context.includes('key')) {
      return 'an important concept or idea';
    }
  }
  
  return 'a key concept from the video';
};