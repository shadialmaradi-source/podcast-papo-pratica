// Smart Content Processing Pipeline for Enhanced Exercise Generation

export interface ContentAnalysis {
  keyPoints: string[];
  learningObjectives: string[];
  summary: string;
  difficulty: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  topics: string[];
  speakers?: SpeakerInfo[];
  dialogues?: DialogueSegment[];
  vocabulary: VocabularyItem[];
  grammarPatterns: GrammarPattern[];
  contextualPhrases: ContextualPhrase[];
}

export interface SpeakerInfo {
  id: string;
  name: string;
  accent?: string;
  role?: string;
  segments: { start: number; end: number; text: string }[];
}

export interface DialogueSegment {
  speakers: string[];
  text: string;
  timestamp?: number;
  context: string;
}

export interface VocabularyItem {
  word: string;
  definition: string;
  context: string;
  frequency: number;
  difficulty: string;
  partOfSpeech: string;
}

export interface GrammarPattern {
  pattern: string;
  rule: string;
  examples: string[];
  difficulty: string;
}

export interface ContextualPhrase {
  phrase: string;
  meaning: string;
  usage: string;
  examples: string[];
}

// Main content processing function
export const processContentIntelligently = (transcript: string, language: string = 'en'): ContentAnalysis => {
  const analysis: ContentAnalysis = {
    keyPoints: extractKeyPoints(transcript),
    learningObjectives: generateLearningObjectives(transcript),
    summary: generateContentSummary(transcript),
    difficulty: assessContentDifficulty(transcript),
    topics: extractAdvancedTopics(transcript),
    speakers: identifySpeakers(transcript),
    dialogues: extractDialogueSegments(transcript),
    vocabulary: extractAdvancedVocabulary(transcript),
    grammarPatterns: identifyGrammarPatterns(transcript),
    contextualPhrases: extractContextualPhrases(transcript)
  };

  return analysis;
};

// Enhanced key point extraction
const extractKeyPoints = (transcript: string): string[] => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const keyPoints: string[] = [];
  
  // Look for key indicators
  const keyIndicators = [
    'important', 'key', 'main', 'primary', 'essential', 'crucial', 'significant',
    'remember', 'note that', 'keep in mind', 'it\'s worth', 'the point is',
    'let me emphasize', 'the key thing', 'what matters', 'the bottom line'
  ];
  
  sentences.forEach(sentence => {
    const lowerSentence = sentence.toLowerCase();
    
    // Check for key indicators
    if (keyIndicators.some(indicator => lowerSentence.includes(indicator))) {
      keyPoints.push(sentence.trim());
    }
    
    // Check for questions (often highlight important points)
    if (sentence.includes('?')) {
      keyPoints.push(sentence.trim());
    }
    
    // Check for numbered/listed items
    if (/^\s*\d+[\.)]\s/.test(sentence) || /first|second|third|finally|lastly/.test(lowerSentence)) {
      keyPoints.push(sentence.trim());
    }
  });
  
  return keyPoints.slice(0, 8); // Limit to most important points
};

// Generate learning objectives based on content
const generateLearningObjectives = (transcript: string): string[] => {
  const objectives: string[] = [];
  const text = transcript.toLowerCase();
  
  // Vocabulary objectives
  const vocabularyWords = extractAdvancedVocabulary(transcript);
  if (vocabularyWords.length > 0) {
    objectives.push(`Learn and understand ${vocabularyWords.length} new vocabulary words in context`);
  }
  
  // Grammar objectives
  const grammarPatterns = identifyGrammarPatterns(transcript);
  if (grammarPatterns.length > 0) {
    objectives.push(`Practice ${grammarPatterns.length} grammar patterns from real speech`);
  }
  
  // Comprehension objectives
  objectives.push('Improve listening comprehension through authentic content');
  objectives.push('Practice inference and context understanding');
  
  // Content-specific objectives
  const topics = extractAdvancedTopics(transcript);
  if (topics.length > 0) {
    objectives.push(`Explore topics related to ${topics.slice(0, 2).join(' and ')}`);
  }
  
  // Speaking/pronunciation if dialogue detected
  if (identifySpeakers(transcript).length > 1) {
    objectives.push('Practice pronunciation through dialogue repetition');
    objectives.push('Learn conversational patterns and natural speech');
  }
  
  return objectives;
};

// Generate intelligent content summary
const generateContentSummary = (transcript: string): string => {
  const sentences = transcript.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const topics = extractAdvancedTopics(transcript);
  const keyPoints = extractKeyPoints(transcript);
  
  if (sentences.length === 0) return "No content available for summary.";
  
  // Extract first few sentences for context
  const intro = sentences.slice(0, 2).join('. ');
  
  // Create summary
  let summary = `This content discusses ${topics[0] || 'various topics'}. `;
  summary += intro.length > 100 ? intro.substring(0, 100) + '...' : intro + '. ';
  
  if (keyPoints.length > 0) {
    summary += `Key points include ${keyPoints.length} important concepts that will help improve your language skills.`;
  }
  
  return summary;
};

// Assess content difficulty using multiple indicators
const assessContentDifficulty = (transcript: string): 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' => {
  const text = transcript.toLowerCase();
  let score = 0;
  
  // Vocabulary complexity
  const complexWords = (text.match(/\b\w{7,}\b/g) || []).length;
  const totalWords = text.split(' ').length;
  const complexityRatio = complexWords / totalWords;
  
  if (complexityRatio > 0.25) score += 3;
  else if (complexityRatio > 0.15) score += 2;
  else if (complexityRatio > 0.08) score += 1;
  
  // Sentence complexity
  const sentences = transcript.split(/[.!?]+/);
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  
  if (avgSentenceLength > 20) score += 2;
  else if (avgSentenceLength > 15) score += 1;
  
  // Grammar complexity indicators
  const complexGrammar = [
    'however', 'nevertheless', 'furthermore', 'consequently', 'therefore',
    'although', 'whereas', 'provided that', 'given that', 'insofar as'
  ];
  
  complexGrammar.forEach(pattern => {
    if (text.includes(pattern)) score += 1;
  });
  
  // Topic complexity
  const specializedTerms = [
    'technology', 'scientific', 'academic', 'professional', 'technical',
    'philosophical', 'theoretical', 'analytical', 'comprehensive'
  ];
  
  specializedTerms.forEach(term => {
    if (text.includes(term)) score += 1;
  });
  
  // Map score to CEFR level
  if (score <= 2) return 'A1';
  if (score <= 4) return 'A2';
  if (score <= 7) return 'B1';
  if (score <= 10) return 'B2';
  if (score <= 13) return 'C1';
  return 'C2';
};

// Extract advanced topics with context
const extractAdvancedTopics = (transcript: string): string[] => {
  const text = transcript.toLowerCase();
  const topics: string[] = [];
  
  // Topic categories with keywords
  const topicMap = {
    'Technology & Innovation': ['technology', 'innovation', 'digital', 'software', 'artificial intelligence', 'machine learning'],
    'Business & Economics': ['business', 'economy', 'market', 'finance', 'investment', 'company', 'profit'],
    'Science & Research': ['science', 'research', 'study', 'experiment', 'analysis', 'discovery', 'theory'],
    'Health & Medicine': ['health', 'medical', 'doctor', 'treatment', 'disease', 'medicine', 'patient'],
    'Education & Learning': ['education', 'learning', 'teach', 'student', 'school', 'university', 'knowledge'],
    'Culture & Society': ['culture', 'society', 'social', 'community', 'tradition', 'custom', 'people'],
    'Environment & Nature': ['environment', 'nature', 'climate', 'sustainability', 'ecology', 'conservation'],
    'Arts & Entertainment': ['art', 'music', 'film', 'literature', 'creative', 'entertainment', 'performance'],
    'Travel & Geography': ['travel', 'country', 'city', 'location', 'geography', 'culture', 'place'],
    'Food & Lifestyle': ['food', 'cooking', 'recipe', 'lifestyle', 'healthy', 'nutrition', 'meal']
  };
  
  Object.entries(topicMap).forEach(([topic, keywords]) => {
    const matches = keywords.filter(keyword => text.includes(keyword));
    if (matches.length >= 2) {
      topics.push(topic);
    }
  });
  
  return topics.length > 0 ? topics : ['General Discussion'];
};

// Identify speakers in transcript
const identifySpeakers = (transcript: string): SpeakerInfo[] => {
  const speakers: SpeakerInfo[] = [];
  
  // Look for speaker indicators
  const speakerPatterns = [
    /^speaker \d+:/gmi,
    /^interviewer:/gmi,
    /^host:/gmi,
    /^guest:/gmi,
    /^\w+:/gm
  ];
  
  let speakerId = 0;
  speakerPatterns.forEach(pattern => {
    const matches = transcript.match(pattern);
    if (matches) {
      matches.forEach(match => {
        const name = match.replace(':', '').trim();
        if (!speakers.find(s => s.name === name)) {
          speakers.push({
            id: `speaker_${speakerId++}`,
            name: name,
            segments: []
          });
        }
      });
    }
  });
  
  // If no explicit speakers found, assume single speaker
  if (speakers.length === 0) {
    speakers.push({
      id: 'speaker_0',
      name: 'Speaker',
      segments: [{ start: 0, end: transcript.length, text: transcript }]
    });
  }
  
  return speakers;
};

// Extract dialogue segments for conversation practice
const extractDialogueSegments = (transcript: string): DialogueSegment[] => {
  const dialogues: DialogueSegment[] = [];
  const lines = transcript.split('\n').filter(line => line.trim().length > 0);
  
  let currentDialogue: string[] = [];
  let currentSpeakers: string[] = [];
  
  lines.forEach(line => {
    const speakerMatch = line.match(/^(\w+):\s*(.+)/);
    
    if (speakerMatch) {
      const [, speaker, text] = speakerMatch;
      
      if (currentDialogue.length > 0 && currentSpeakers.length > 1) {
        dialogues.push({
          speakers: [...currentSpeakers],
          text: currentDialogue.join(' '),
          context: 'conversation'
        });
      }
      
      currentDialogue = [text];
      currentSpeakers = [speaker];
    } else if (currentDialogue.length > 0) {
      currentDialogue.push(line);
    }
  });
  
  // Add final dialogue if exists
  if (currentDialogue.length > 0 && currentSpeakers.length > 1) {
    dialogues.push({
      speakers: [...currentSpeakers],
      text: currentDialogue.join(' '),
      context: 'conversation'
    });
  }
  
  return dialogues;
};

// Enhanced vocabulary extraction with detailed analysis
const extractAdvancedVocabulary = (transcript: string): VocabularyItem[] => {
  const words = transcript.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
  const wordFreq: Record<string, number> = {};
  
  // Count word frequency
  words.forEach(word => {
    wordFreq[word] = (wordFreq[word] || 0) + 1;
  });
  
  // Filter and analyze words
  const vocabulary: VocabularyItem[] = [];
  const commonWords = new Set(['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'have', 'this', 'will', 'can', 'but', 'not', 'what', 'all', 'were', 'they', 'has', 'had']);
  
  Object.entries(wordFreq).forEach(([word, frequency]) => {
    if (word.length >= 4 && !commonWords.has(word) && frequency >= 2) {
      vocabulary.push({
        word: word,
        definition: generateContextualDefinition(word, transcript),
        context: findWordContext(word, transcript),
        frequency: frequency,
        difficulty: assessWordDifficulty(word),
        partOfSpeech: guessPartOfSpeech(word, transcript)
      });
    }
  });
  
  return vocabulary.sort((a, b) => b.frequency - a.frequency).slice(0, 15);
};

// Identify grammar patterns in the text
const identifyGrammarPatterns = (transcript: string): GrammarPattern[] => {
  const patterns: GrammarPattern[] = [];
  const text = transcript.toLowerCase();
  
  // Common grammar patterns to identify
  const grammarRules = [
    {
      pattern: 'present perfect',
      regex: /\b(have|has)\s+\w+ed\b/g,
      rule: 'Present Perfect: have/has + past participle',
      difficulty: 'B1'
    },
    {
      pattern: 'passive voice',
      regex: /\b(is|are|was|were)\s+\w+ed\b/g,
      rule: 'Passive Voice: be + past participle',
      difficulty: 'B2'
    },
    {
      pattern: 'conditional',
      regex: /\bif\s+.+\s+(would|could|might)\b/g,
      rule: 'Conditional: if + condition, would/could/might + verb',
      difficulty: 'B1'
    },
    {
      pattern: 'relative clauses',
      regex: /\b(who|which|that)\s+\w+/g,
      rule: 'Relative Clauses: who/which/that + information',
      difficulty: 'B1'
    }
  ];
  
  grammarRules.forEach(rule => {
    const matches = text.match(rule.regex);
    if (matches && matches.length >= 2) {
      patterns.push({
        pattern: rule.pattern,
        rule: rule.rule,
        examples: matches.slice(0, 3),
        difficulty: rule.difficulty
      });
    }
  });
  
  return patterns;
};

// Extract contextual phrases and expressions
const extractContextualPhrases = (transcript: string): ContextualPhrase[] => {
  const phrases: ContextualPhrase[] = [];
  const text = transcript.toLowerCase();
  
  // Common phrase patterns
  const phrasePatterns = [
    { pattern: /\bin order to\s+\w+/g, meaning: 'purpose or intention', usage: 'expressing purpose' },
    { pattern: /\bas a result\s+of/g, meaning: 'consequence or outcome', usage: 'showing cause and effect' },
    { pattern: /\bon the other hand/g, meaning: 'contrasting viewpoint', usage: 'presenting contrast' },
    { pattern: /\bin addition to/g, meaning: 'adding information', usage: 'providing additional information' },
    { pattern: /\bdue to the fact that/g, meaning: 'because of', usage: 'explaining reasons' }
  ];
  
  phrasePatterns.forEach(({ pattern, meaning, usage }) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        phrases.push({
          phrase: match,
          meaning: meaning,
          usage: usage,
          examples: [findPhraseContext(match, transcript)]
        });
      });
    }
  });
  
  return phrases;
};

// Helper functions
const generateContextualDefinition = (word: string, transcript: string): string => {
  // Basic definitions - in a real app, you'd use a dictionary API
  const definitions: Record<string, string> = {
    'learning': 'acquiring knowledge or skills through study',
    'language': 'system of communication using words',
    'important': 'having great significance or value',
    'understand': 'comprehend or grasp the meaning',
    'practice': 'repeated exercise to improve skill'
  };
  
  return definitions[word] || `a key term from the content`;
};

const findWordContext = (word: string, transcript: string): string => {
  const sentences = transcript.split(/[.!?]+/);
  const contextSentence = sentences.find(s => s.toLowerCase().includes(word));
  return contextSentence?.trim() || '';
};

const assessWordDifficulty = (word: string): string => {
  if (word.length <= 4) return 'A1';
  if (word.length <= 6) return 'A2';
  if (word.length <= 8) return 'B1';
  if (word.length <= 10) return 'B2';
  return 'C1';
};

const guessPartOfSpeech = (word: string, transcript: string): string => {
  // Simple heuristics - in production, use NLP library
  if (word.endsWith('ing')) return 'verb/gerund';
  if (word.endsWith('ed')) return 'past participle';
  if (word.endsWith('ly')) return 'adverb';
  if (word.endsWith('tion') || word.endsWith('sion')) return 'noun';
  return 'unknown';
};

const findPhraseContext = (phrase: string, transcript: string): string => {
  const sentences = transcript.split(/[.!?]+/);
  const contextSentence = sentences.find(s => s.toLowerCase().includes(phrase));
  return contextSentence?.trim() || '';
};