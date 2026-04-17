import { supabase } from "@/integrations/supabase/client";

// In-memory cache to avoid repeated AI calls for the same word
const wordAnalysisCache = new Map<string, WordAnalysis>();

function getCacheKey(word: string, language: string, nativeLanguage: string): string {
  return `${word.toLowerCase().trim()}:${language.toLowerCase()}:${nativeLanguage.toLowerCase()}`;
}

export function clearWordAnalysisCache() {
  wordAnalysisCache.clear();
}

export interface WordAnalysis {
  translation: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  extras?: {
    conjugation?: {
      infinitive?: string;
      present?: Record<string, string>;
      past?: Record<string, string>;
      future?: Record<string, string>;
    };
    gender?: string;
    plural?: string;
    forms?: {
      masculine_singular?: string;
      feminine_singular?: string;
      masculine_plural?: string;
      feminine_plural?: string;
      comparative?: string;
      superlative?: string;
    };
    literalMeaning?: string;
    formality?: string;
    relatedWords?: { word: string; translation: string }[];
    usageNotes?: string;
  };
}

export interface TranscriptWordSuggestion {
  id?: string;
  phrase: string;
  translation: string;
  partOfSpeech: string;
  why: string;
  segmentIndex: number;
}

/**
 * Analyze a word or phrase using AI
 */
export async function analyzeWord(
  word: string,
  language: string,
  contextSentence?: string,
  nativeLanguage: string = "english"
): Promise<WordAnalysis> {
  const cacheKey = getCacheKey(word, language, nativeLanguage);
  const cached = wordAnalysisCache.get(cacheKey);
  if (cached) return cached;

  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) {
    throw new Error("You must be signed in to analyze words.");
  }

  const { data, error } = await supabase.functions.invoke("analyze-word", {
    body: { word, language, contextSentence, nativeLanguage },
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (error) {
    console.error("Error analyzing word:", error);
    throw new Error(error.message || "Failed to analyze word");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const result = data as WordAnalysis;
  wordAnalysisCache.set(cacheKey, result);
  return result;
}

/**
 * Get AI-suggested vocabulary words for a transcript
 */
export async function getTranscriptSuggestions(
  videoId: string,
  transcript: string,
  language: string,
  difficulty?: string
): Promise<TranscriptWordSuggestion[]> {
  const { data, error } = await supabase.functions.invoke("suggest-transcript-words", {
    body: { videoId, transcript, language, difficulty },
  });

  if (error) {
    console.error("Error getting transcript suggestions:", error);
    throw new Error(error.message || "Failed to get suggestions");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return (data?.suggestions || []).map((s: any) => ({
    id: s.id,
    phrase: s.phrase,
    translation: s.translation,
    partOfSpeech: s.partOfSpeech || s.part_of_speech,
    why: s.why,
    segmentIndex: s.segmentIndex ?? s.segment_index ?? 0,
  }));
}
