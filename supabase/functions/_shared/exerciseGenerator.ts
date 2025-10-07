export interface Exercise {
  id: string;
  type: string;
  question: string;
  options?: any;
  correctAnswer: string;
  explanation: string;
  points: number;
  difficulty: string;
  level: string;
  mode: string;
  orderIndex?: number;
  vocabularyWords?: string[];
  contextSentence?: string;
}

export async function generateAllExercises(transcript: string, videoId: string): Promise<any[]> {
  const exercises = [];
  const difficulties = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const intensities = ['light', 'intense'];

  for (const difficulty of difficulties) {
    for (const intensity of intensities) {
      const exerciseCount = intensity === 'light' ? 5 : 10;
      const generatedExercises = generateTranscriptBasedExercises(transcript, difficulty, exerciseCount);
      
      for (let i = 0; i < generatedExercises.length; i++) {
        const exercise = generatedExercises[i];
        exercises.push({
          video_id: videoId,
          question: exercise.question,
          exercise_type: exercise.type,
          options: exercise.options || null,
          correct_answer: exercise.correctAnswer,
          explanation: exercise.explanation || '',
          difficulty,
          intensity,
          xp_reward: exercise.points || 10,
          order_index: i,
          vocabulary_words: exercise.vocabularyWords || null,
          context_sentence: exercise.contextSentence || null
        });
      }
    }
  }

  return exercises;
}

export function generateTranscriptBasedExercises(transcript: string, level: string, exerciseCount: number): Exercise[] {
  const exercises: Exercise[] = [];
  const sentences = transcript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20);
  
  if (sentences.length === 0) return exercises;

  const mode = exerciseCount > 5 ? 'intense' : 'light';
  
  // Generate different types of exercises
  const types = ['multiple_choice', 'true_false', 'gap_fill', 'matching'];
  
  for (let i = 0; i < exerciseCount && i < sentences.length; i++) {
    const sentence = sentences[i];
    const type = types[i % types.length];
    
    let exercise: Exercise;
    
    switch (type) {
      case 'multiple_choice':
        exercise = generateMCQFromSentence(sentence, level, mode, i);
        break;
      case 'true_false':
        exercise = generateTrueFalseFromSentence(sentence, level, mode, i);
        break;
      case 'gap_fill':
        exercise = generateGapFillFromSentence(sentence, level, mode, i);
        break;
      case 'matching':
        exercise = generateMatchingFromSentence(sentence, level, mode, i);
        break;
      default:
        exercise = generateMCQFromSentence(sentence, level, mode, i);
    }
    
    exercises.push(exercise);
  }
  
  return exercises;
}

export function generateMCQFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ').filter(w => w.length > 3);
  const targetWord = words[Math.floor(Math.random() * words.length)] || 'word';
  
  const options = [
    targetWord,
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord)
  ].sort(() => Math.random() - 0.5);

  return {
    id: `mcq_${index}`,
    type: 'multiple_choice',
    question: `What does "${targetWord}" mean in this context: "${sentence}"?`,
    options,
    correctAnswer: targetWord,
    explanation: `The correct answer is "${targetWord}" based on the context.`,
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

export function generateTrueFalseFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const isTrue = Math.random() > 0.5;
  const question = isTrue ? sentence : modifySentenceToFalse(sentence);
  
  return {
    id: `tf_${index}`,
    type: 'true_false',
    question: `True or False: ${question}`,
    options: ['True', 'False'],
    correctAnswer: isTrue ? 'True' : 'False',
    explanation: isTrue ? 'This statement is true according to the video.' : 'This statement is false according to the video.',
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

export function generateGapFillFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ');
  const randomIndex = Math.floor(Math.random() * words.length);
  const targetWord = words[randomIndex];
  const gappedSentence = words.map((w, i) => i === randomIndex ? '___' : w).join(' ');
  
  const options = [
    targetWord,
    generateSimilarWord(targetWord),
    generateSimilarWord(targetWord)
  ].sort(() => Math.random() - 0.5);

  return {
    id: `gap_${index}`,
    type: 'gap_fill',
    question: `Fill in the blank: ${gappedSentence}`,
    options,
    correctAnswer: targetWord,
    explanation: `The correct word is "${targetWord}".`,
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

export function generateMatchingFromSentence(sentence: string, level: string, mode: string, index: number): Exercise {
  const words = sentence.split(' ').filter(w => w.length > 4).slice(0, 3);
  const pairs = words.map(word => [word, generateDefinition(word)]);
  
  return {
    id: `match_${index}`,
    type: 'matching',
    question: 'Match the words with their definitions:',
    options: {
      words: pairs.map(p => p[0]),
      definitions: pairs.map(p => p[1]).sort(() => Math.random() - 0.5)
    },
    correctAnswer: JSON.stringify(pairs),
    explanation: 'Match each word with its correct definition.',
    points: getPointsByLevel(level),
    difficulty: level,
    level,
    mode,
    orderIndex: index
  };
}

export function generateSimilarWord(word: string): string {
  const similar = {
    'the': 'a',
    'and': 'or',
    'is': 'was',
    'are': 'were',
    'this': 'that',
    'have': 'has',
    'with': 'without',
    'for': 'from',
    'can': 'could',
    'will': 'would'
  };
  return similar[word.toLowerCase()] || word + 's';
}

export function modifySentenceToFalse(sentence: string): string {
  const modifications = [
    s => s.replace(/is/g, 'is not'),
    s => s.replace(/are/g, 'are not'),
    s => s.replace(/can/g, 'cannot'),
    s => s.replace(/will/g, 'will not'),
    s => s.replace(/have/g, 'do not have')
  ];
  
  const modifier = modifications[Math.floor(Math.random() * modifications.length)];
  return modifier(sentence);
}

export function generateDefinition(word: string): string {
  return `Definition of ${word}`;
}

export function getPointsByLevel(level: string): number {
  const points = {
    'A1': 5,
    'A2': 7,
    'B1': 10,
    'B2': 12,
    'C1': 15,
    'C2': 20
  };
  return points[level] || 10;
}
