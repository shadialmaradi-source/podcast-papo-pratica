import { supabase } from "@/integrations/supabase/client";

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
  contextSentence?: string
): Promise<WordAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-word", {
    body: { word, language, contextSentence },
  });

  if (error) {
    console.error("Error analyzing word:", error);
    throw new Error(error.message || "Failed to analyze word");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as WordAnalysis;
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
