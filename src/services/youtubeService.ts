interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

// Mock YouTube API service (in real implementation, use YouTube Data API v3)
export const getVideoInfo = async (videoId: string): Promise<VideoInfo> => {
  // In a real implementation, this would call YouTube Data API v3
  // For now, return mock data
  return {
    id: videoId,
    title: "Language Learning Tutorial",
    description: "Learn effective techniques for language acquisition through authentic content.",
    duration: "15:42",
    thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
  };
};

// Extract transcript from YouTube video
export const getVideoTranscript = async (videoId: string): Promise<string> => {
  try {
    // In a real implementation, you would use the youtube-transcript library
    // For now, return a realistic mock transcript
    const mockTranscript = `
Welcome to this comprehensive guide on language learning through authentic video content.

Today we're going to explore how you can dramatically improve your language skills by using real YouTube videos as your primary learning material. This method has been proven effective by thousands of language learners worldwide.

First, let's talk about the importance of comprehensible input. When you watch videos that are just slightly above your current level, you create the perfect conditions for natural language acquisition. Your brain automatically starts picking up patterns, vocabulary, and pronunciation.

The key is to choose content that genuinely interests you. If you're passionate about cooking, watch cooking shows in your target language. If you love technology, find tech reviews and tutorials. This emotional connection makes the learning process much more effective.

Let me share three essential strategies:

Strategy number one: Start with subtitles in your target language, not your native language. This forces your brain to make connections between the spoken and written forms of the language. Initially, you might feel overwhelmed, but stick with it. Your comprehension will improve rapidly.

Strategy number two: Practice active listening. Don't just passively consume content. Pause frequently to repeat what you heard. Shadow the speaker - try to match their pronunciation and intonation. This builds your speaking muscles while improving listening skills.

Strategy number three: Take notes of new vocabulary and phrases. But here's the crucial part - don't just write translations. Write the context where you heard the word. Context is everything in language learning. A word like "run" can mean different things depending on the situation.

Remember, consistency beats intensity every time. It's better to watch 15 minutes of authentic content daily than to have a three-hour study session once a week. Your brain needs regular exposure to process and internalize the language patterns.

One common mistake learners make is jumping to content that's too difficult. If you understand less than 70% of what you're hearing, the material is probably too advanced. You'll just get frustrated and give up. Be patient with yourself and choose appropriate level content.

Another important aspect is cultural immersion. Videos don't just teach you language - they teach you culture. You learn how people actually speak, their gestures, their humor, their way of thinking. This cultural competence is just as important as linguistic competence.

Finally, don't be afraid to watch the same video multiple times. Each viewing reveals new details. The first time you might catch the general idea. The second time you'll notice specific vocabulary. The third time you'll pick up subtle pronunciation features.

Language learning is a marathon, not a sprint. Enjoy the journey, celebrate small victories, and trust the process. With authentic video content as your guide, you'll develop natural, fluent communication skills that textbooks simply cannot provide.

Thank you for watching, and I wish you the best on your language learning adventure!
    `.trim();

    return mockTranscript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Could not fetch transcript for this video. Please try another video or check if captions are available.');
  }
};

// Extract key vocabulary from transcript based on CEFR level
export const extractVocabulary = (transcript: string, level: string): string[] => {
  const words = transcript.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  const vocabularyByLevel = {
    A1: words.filter(word => 
      ['learn', 'language', 'video', 'watch', 'listen', 'speak', 'understand', 'practice', 'study', 'new', 'important', 'good', 'time', 'content'].includes(word)
    ),
    A2: words.filter(word => 
      ['improve', 'effective', 'method', 'vocabulary', 'pronunciation', 'authentic', 'strategy', 'progress', 'skill', 'natural', 'perfect', 'create', 'connect', 'repeat'].includes(word)
    ),
    B1: words.filter(word => 
      ['comprehensible', 'acquisition', 'dramatically', 'patterns', 'passionate', 'emotional', 'overwhelmed', 'comprehension', 'context', 'consistency', 'intensity'].includes(word)
    ),
    B2: words.filter(word => 
      ['comprehensive', 'primarily', 'automatically', 'initially', 'frequently', 'intonation', 'crucial', 'translations', 'internalize', 'appropriate', 'frustrated'].includes(word)
    ),
    C1: words.filter(word => 
      ['dramatically', 'comprehensible', 'acquisition', 'automatically', 'overwhelmed', 'comprehension', 'consistency', 'internalize', 'appropriate', 'competence', 'linguistic'].includes(word)
    ),
    C2: words.filter(word => 
      ['comprehensive', 'acquisition', 'automatically', 'overwhelmed', 'internalize', 'competence', 'linguistic', 'cultural', 'immersion', 'subtleties', 'nuanced'].includes(word)
    )
  };

  return [...new Set(vocabularyByLevel[level as keyof typeof vocabularyByLevel] || vocabularyByLevel.A1)].slice(0, 15);
};

// Generate contextual sentences from transcript
export const getContextualSentences = (transcript: string, count: number = 10): string[] => {
  const sentences = transcript
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 150)
    .slice(0, count);

  return sentences;
};