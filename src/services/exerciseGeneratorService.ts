import { extractVocabulary, getContextualSentences } from './youtubeService';

export interface Exercise {
  id: string;
  type: "MCQ" | "TF" | "Matching" | "Sequencing" | "Cloze" | "SpotError";
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
  mode: "light" | "intense";
}

// Generate exercises based on actual transcript content
export const generateTranscriptBasedExercises = (
  transcript: string, 
  level: string, 
  exerciseCount: number = 10
): Exercise[] => {
  const exercises: Exercise[] = [];
  const mode = exerciseCount <= 10 ? "light" : "intense";
  const baseId = Date.now().toString();
  
  if (mode === "light") {
    // Light mode: 10 questions, easier and clearer
    exercises.push(...generateMCQExercises(transcript, level, mode, baseId, 3));
    exercises.push(...generateTrueFalseExercises(transcript, level, mode, baseId, 2));
    exercises.push(...generateClozeExercises(transcript, level, mode, baseId, 2));
    exercises.push(...generateMatchingExercises(transcript, level, mode, baseId, 2));
    exercises.push(...generateSequencingExercises(transcript, level, mode, baseId, 1));
  } else {
    // Intense mode: 20 questions, harder with more similar options
    exercises.push(...generateMCQExercises(transcript, level, mode, baseId, 6));
    exercises.push(...generateTrueFalseExercises(transcript, level, mode, baseId, 4));
    exercises.push(...generateClozeExercises(transcript, level, mode, baseId, 4));
    exercises.push(...generateMatchingExercises(transcript, level, mode, baseId, 3));
    exercises.push(...generateSequencingExercises(transcript, level, mode, baseId, 2));
    exercises.push(...generateSpotErrorExercises(transcript, level, mode, baseId, 1));
  }

  return exercises.slice(0, exerciseCount);
};

// Generate multiple choice questions (MCQ)
const generateMCQExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 10);
  const vocabulary = extractVocabulary(transcript, level);
  const topics = extractTopicsFromTranscript(transcript);
  
  if (sentences.length === 0) return exercises;

  for (let i = 0; i < count && i < sentences.length; i++) {
    const isIntense = mode === "intense";
    
    if (i === 0) {
      // Main topic comprehension
      const mainTopic = topics[0] || 'general discussion';
      const distractors = isIntense 
        ? ['educational content', 'informational material', 'tutorial content'] 
        : ['cooking recipes', 'sports training', 'computer programming'];
      
      exercises.push({
        id: `mcq-${i + 1}-${videoId}`,
        type: 'MCQ',
        question: `What is the main topic discussed in this video?`,
        options: [mainTopic, ...distractors],
        correctAnswer: mainTopic,
        explanation: `The video primarily discusses ${mainTopic.toLowerCase()}.`,
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    } else if (vocabulary.length > i - 1) {
      // Vocabulary comprehension
      const word = vocabulary[i - 1];
      const definition = generateDefinition(word, sentences[i]);
      const distractors = isIntense
        ? [generateSimilarDefinition(word), generateCloseDefinition(word), generateRelatedDefinition(word)]
        : ['something unrelated', 'a type of food', 'a place or location'];
      
      exercises.push({
        id: `mcq-${i + 1}-${videoId}`,
        type: 'MCQ',
        question: `What does "${word}" mean in this context?`,
        options: [definition, ...distractors],
        correctAnswer: definition,
        explanation: `"${word}" refers to ${definition.toLowerCase()} based on the video context.`,
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    } else {
      // Content comprehension
      const sentence = sentences[i];
      const shortSentence = sentence.substring(0, 60) + '...';
      const distractors = isIntense
        ? [generateSimilarSentence(sentence), generateRelatedSentence(sentence), generateCloseContent(sentence)]
        : ['The weather is always sunny', 'Cats are better than dogs', 'Pizza is the best food'];
      
      exercises.push({
        id: `mcq-${i + 1}-${videoId}`,
        type: 'MCQ',
        question: 'Which statement is mentioned in the video?',
        options: [shortSentence, ...distractors],
        correctAnswer: shortSentence,
        explanation: 'This statement was directly mentioned in the video transcript.',
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    }
  }

  return exercises;
};

// Generate cloze exercises (fill-in-the-gap with predefined options)
const generateClozeExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 8);
  const vocabulary = extractVocabulary(transcript, level);
  
  if (sentences.length === 0) return exercises;

  for (let i = 0; i < count && i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.split(' ');
    const isIntense = mode === "intense";
    
    // Find a good word to remove
    const targetWord = words.find(word => 
      word.length > 4 && 
      !['that', 'this', 'they', 'with', 'from', 'have', 'will', 'when', 'what', 'where'].includes(word.toLowerCase()) &&
      /^[a-zA-Z]+$/.test(word)
    );

    if (targetWord) {
      const cleanWord = targetWord.toLowerCase().replace(/[^\w]/g, '');
      const blankSentence = sentence.replace(new RegExp(`\\b${targetWord}\\b`, 'i'), '______');
      
      // Generate options based on intensity
      let options: string[];
      if (isIntense) {
        // Multiple gaps for intense mode
        const gaps = isIntense ? 2 : 1;
        options = [cleanWord, generateSimilarWord(cleanWord), generateRelatedWord(cleanWord), generateCloseWord(cleanWord)];
      } else {
        options = [cleanWord, vocabulary[0] || 'different', vocabulary[1] || 'unrelated', 'incorrect'];
      }
      
      exercises.push({
        id: `cloze-${i + 1}-${videoId}`,
        type: 'Cloze',
        question: `Fill in the blank: "${blankSentence}"`,
        options: options.filter(Boolean),
        correctAnswer: cleanWord,
        explanation: `The word "${cleanWord}" fits the context of the sentence from the video.`,
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    }
  }

  return exercises;
};

// Generate matching exercises (pair items)
const generateMatchingExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const vocabulary = extractVocabulary(transcript, level);
  const sentences = getContextualSentences(transcript, 10);
  
  if (vocabulary.length < 3) return exercises;

  for (let i = 0; i < count; i++) {
    const isIntense = mode === "intense";
    const pairCount = isIntense ? 6 : 4;
    
    // Create vocabulary-definition pairs
    const pairs = vocabulary.slice(0, pairCount).map(word => ({
      term: word,
      definition: generateDefinition(word, sentences.find(s => s.includes(word)) || '')
    }));
    
    if (pairs.length >= 3) {
      // Format as matching exercise
      const terms = pairs.map(p => p.term);
      const definitions = pairs.map(p => p.definition);
      
      exercises.push({
        id: `matching-${i + 1}-${videoId}`,
        type: 'Matching',
        question: `Match each term with its correct definition:`,
        options: [...terms, ...definitions],
        correctAnswer: JSON.stringify(pairs),
        explanation: `These terms and definitions are based on the video content.`,
        points: getPointsByLevel(level) * 2,
        difficulty: level,
        level,
        mode
      });
    }
  }

  return exercises;
};

// Generate true/false exercises
const generateTrueFalseExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 10);
  
  if (sentences.length === 0) return exercises;

  for (let i = 0; i < count; i++) {
    const isTrue = i % 2 === 0;
    
    if (isTrue && sentences.length > i) {
      // True statement from transcript
      const sentence = sentences[i];
      const statement = sentence.length > 80 ? sentence.substring(0, 80) + '...' : sentence;
      
      exercises.push({
        id: `tf-${i + 1}-${videoId}`,
        type: 'TF',
        question: `True or False: ${statement}`,
        options: ['True', 'False'],
        correctAnswer: 'True',
        explanation: 'This statement is directly mentioned in the video.',
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    } else {
      // False statement
      const falseStatements = [
        'The video is about cooking recipes.',
        'This content focuses on sports training.',
        'The main topic is computer programming.',
        'The video discusses weather patterns.',
        'This is a tutorial about gardening.'
      ];
      
      exercises.push({
        id: `tf-${i + 1}-${videoId}`,
        type: 'TF',
        question: `True or False: ${falseStatements[i % falseStatements.length]}`,
        options: ['True', 'False'],
        correctAnswer: 'False',
        explanation: 'This statement does not match the video content.',
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    }
  }

  return exercises;
};

// Generate sequencing exercises (order events)
const generateSequencingExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 12);
  
  if (sentences.length < 4) return exercises;

  for (let i = 0; i < count; i++) {
    const isIntense = mode === "intense";
    const sequenceLength = isIntense ? 6 : 4;
    
    // Take consecutive sentences from transcript
    const sequence = sentences.slice(i * sequenceLength, i * sequenceLength + sequenceLength).map((s, idx) => 
      s.length > 60 ? s.substring(0, 60) + '...' : s
    );
    
    if (sequence.length >= 3) {
      // Shuffle the sequence for the options
      const shuffled = [...sequence].sort(() => Math.random() - 0.5);
      
      exercises.push({
        id: `seq-${i + 1}-${videoId}`,
        type: 'Sequencing',
        question: `Put these statements in the correct order as they appear in the video:`,
        options: shuffled,
        correctAnswer: JSON.stringify(sequence),
        explanation: 'This is the correct order based on the video timeline.',
        points: getPointsByLevel(level) * 2,
        difficulty: level,
        level,
        mode
      });
    }
  }

  return exercises;
};

// Generate spot the error exercises
const generateSpotErrorExercises = (transcript: string, level: string, mode: "light" | "intense", videoId: string, count: number): Exercise[] => {
  const exercises: Exercise[] = [];
  const sentences = getContextualSentences(transcript, 8);
  const vocabulary = extractVocabulary(transcript, level);
  
  if (sentences.length === 0) return exercises;

  for (let i = 0; i < count && i < sentences.length; i++) {
    const sentence = sentences[i];
    const words = sentence.split(' ');
    
    // Replace a word with an incorrect one
    const targetWordIndex = words.findIndex(word => 
      word.length > 4 && 
      !['that', 'this', 'they', 'with', 'from'].includes(word.toLowerCase())
    );
    
    if (targetWordIndex !== -1) {
      const correctWord = words[targetWordIndex];
      const incorrectWord = vocabulary.find(v => v !== correctWord) || 'incorrect';
      const errorSentence = words.map((word, idx) => 
        idx === targetWordIndex ? incorrectWord : word
      ).join(' ');
      
      exercises.push({
        id: `error-${i + 1}-${videoId}`,
        type: 'SpotError',
        question: `Find the error in this sentence: "${errorSentence}"`,
        options: [correctWord, incorrectWord, 'no error', 'grammar mistake'],
        correctAnswer: correctWord,
        explanation: `The word "${incorrectWord}" should be "${correctWord}" based on the video content.`,
        points: getPointsByLevel(level),
        difficulty: level,
        level,
        mode
      });
    }
  }

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

// Helper functions for generating similar distractors
const generateSimilarDefinition = (word: string): string => {
  const base = generateDefinition(word, '');
  return base.replace(/\b\w+\b/, match => match === 'process' ? 'method' : 'technique');
};

const generateCloseDefinition = (word: string): string => {
  return 'a related concept or idea';
};

const generateRelatedDefinition = (word: string): string => {
  return 'something connected to the topic';
};

const generateSimilarSentence = (sentence: string): string => {
  const words = sentence.split(' ');
  if (words.length > 3) {
    words[Math.floor(words.length / 2)] = 'similar';
    return words.join(' ').substring(0, 60) + '...';
  }
  return 'A similar but different statement...';
};

const generateRelatedSentence = (sentence: string): string => {
  return 'A related topic was discussed...';
};

const generateCloseContent = (sentence: string): string => {
  return 'Content about a similar subject...';
};

const generateSimilarWord = (word: string): string => {
  const similar = {
    'learning': 'studying',
    'important': 'significant',
    'effective': 'efficient',
    'method': 'approach',
    'content': 'material'
  };
  return similar[word.toLowerCase() as keyof typeof similar] || 'related';
};

const generateRelatedWord = (word: string): string => {
  return word.endsWith('ing') ? word.replace('ing', 'ed') : word + 's';
};

const generateCloseWord = (word: string): string => {
  return word.length > 4 ? word.substring(0, word.length - 1) + 'e' : 'close';
};