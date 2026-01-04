import { supabase } from "@/integrations/supabase/client";

interface VideoInfo {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnail: string;
}

// Helper to extract video ID from full YouTube URL or return as-is if already an ID
export const extractVideoId = (urlOrId: string): string | null => {
  if (!urlOrId) return null;
  
  const trimmed = urlOrId.trim();
  
  // If it doesn't look like a URL, assume it's already a video ID
  if (!trimmed.includes('http') && !trimmed.includes('/') && !trimmed.includes('.')) {
    return trimmed;
  }
  
  // Handle youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  
  // Handle youtu.be/ID
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  
  // Handle youtube.com/embed/ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  
  return null;
};

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

// Extract transcript using Supabase Edge Function (calls Supadata server-side - no CORS!)
export const getVideoTranscript = async (videoIdOrUrl: string): Promise<string> => {
  console.log('[getVideoTranscript] Input:', videoIdOrUrl);
  
  const videoId = extractVideoId(videoIdOrUrl);
  
  if (!videoId) {
    throw new Error('Could not extract video ID from the provided URL');
  }
  
  console.log('[getVideoTranscript] Extracted video ID:', videoId);
  console.log('[getVideoTranscript] Calling Edge Function...');
  
  try {
    const { data, error } = await supabase.functions.invoke(
      'extract-youtube-transcript',
      { body: { videoId } }
    );
    
    if (error) {
      console.error('[getVideoTranscript] Edge function error:', error);
      throw new Error(error.message || 'Failed to call transcript service');
    }
    
    console.log('[getVideoTranscript] Response:', data);
    
    if (!data?.success || !data?.transcript) {
      throw new Error(data?.error || 'No transcript available for this video');
    }
    
    console.log(`[getVideoTranscript] Success via ${data.method}, ${data.transcript.length} chars`);
    return data.transcript;
    
  } catch (error) {
    console.error('[getVideoTranscript] Error:', error);
    throw error instanceof Error ? error : new Error('Failed to extract transcript');
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
