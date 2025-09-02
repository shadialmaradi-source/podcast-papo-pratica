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

export const getVideoInfo = async (videoId: string): Promise<VideoInfo> => {
  try {
    // Use YouTube oEmbed API (no API key required)
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Video not found');
    }
    
    const data = await response.json();
    
    return {
      id: videoId,
      title: data.title || 'YouTube Video',
      description: data.author_name ? `Video by ${data.author_name}` : 'YouTube Video',
      duration: 'N/A', // oEmbed doesn't provide duration
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    throw new Error('Could not fetch video information.');
  }
};

// Extract transcript from YouTube video
export const getVideoTranscript = async (videoId: string): Promise<string> => {
  try {
    // Use youtube-transcript-api (free public API)
    const response = await fetch(`https://youtube-transcript-api.vercel.app/api/transcript?video_id=${videoId}`);
    
    if (!response.ok) {
      throw new Error('Transcript not available');
    }
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    // Combine all transcript segments into one text
    const transcript = data.map((item: any) => item.text).join(' ');
    
    if (!transcript || transcript.trim().length === 0) {
      throw new Error('No transcript text found');
    }
    
    return transcript;
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Could not fetch transcript for this video. Please try another video with captions enabled.');
  }
};

// Extract key vocabulary from transcript based on CEFR level
export const extractVocabulary = (transcript: string, level: string): string[] => {
  const words = transcript.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);

  // Get word frequency
  const wordCount = words.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Filter out very common words (articles, pronouns, etc.)
  const stopWords = new Set(['the', 'and', 'you', 'that', 'this', 'are', 'for', 'with', 'can', 'will', 'have', 'not', 'but', 'they', 'our', 'your', 'all', 'any', 'may', 'she', 'her', 'him', 'his', 'its', 'was', 'were', 'been', 'has', 'had', 'did', 'get', 'got', 'how', 'who', 'what', 'why', 'when', 'where']);
  
  // Get unique words sorted by frequency and length (prefer longer, more frequent words)
  const uniqueWords = Object.entries(wordCount)
    .filter(([word]) => !stopWords.has(word) && word.length > 3)
    .sort(([, a], [, b]) => b - a)
    .map(([word]) => word);

  // Filter by complexity based on level
  const complexityFilters = {
    A1: (word: string) => word.length <= 6 && /^[a-z]+$/.test(word),
    A2: (word: string) => word.length <= 8 && /^[a-z]+$/.test(word),
    B1: (word: string) => word.length <= 10,
    B2: (word: string) => word.length <= 12,
    C1: (word: string) => word.length <= 15,
    C2: (word: string) => true
  };

  const filter = complexityFilters[level as keyof typeof complexityFilters] || complexityFilters.A1;
  return uniqueWords.filter(filter).slice(0, 15);
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