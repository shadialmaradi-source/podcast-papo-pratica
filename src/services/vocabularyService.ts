import { supabase } from "@/integrations/supabase/client";

export interface VocabularyWord {
  id: string;
  word: string;
  translation?: string;
  definition: string;
  language: string;
  difficulty_level: string;
  frequency_rank?: number;
}

export interface VocabularyProgress {
  id: string;
  user_id: string;
  word_id: string;
  episode_id?: string;
  mastery_level: number;
  times_seen: number;
  times_correct: number;
  last_review_date?: string;
  next_review_date?: string;
  is_learned: boolean;
  word?: VocabularyWord;
}

export interface SRSReview {
  word_id: string;
  difficulty_rating: number;
  is_correct: boolean;
  response_time?: number;
}

// Get vocabulary words due for review
export const getVocabularyDueForReview = async (limit: number = 20): Promise<any[]> => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { data, error } = await supabase.rpc('get_vocabulary_due_for_review', {
    p_user_id: currentUser.user.id,
    p_limit: limit
  });

  if (error) {
    console.error('Error fetching vocabulary due for review:', error);
    throw error;
  }

  return data || [];
};

// Get user's vocabulary progress stats
export const getVocabularyStats = async () => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_vocabulary_progress')
    .select(`
      mastery_level,
      is_learned,
      times_seen,
      times_correct,
      vocabulary_words!inner(
        language,
        difficulty_level
      )
    `)
    .eq('user_id', currentUser.user.id);

  if (error) throw error;

  const stats = {
    total_words: data?.length || 0,
    learned_words: data?.filter(p => p.is_learned).length || 0,
    review_due: 0, // Will be calculated separately
    accuracy: 0,
    by_language: {} as Record<string, number>,
    by_difficulty: {} as Record<string, number>
  };

  if (data && data.length > 0) {
    // Calculate accuracy
    const totalAttempts = data.reduce((sum, p) => sum + p.times_seen, 0);
    const totalCorrect = data.reduce((sum, p) => sum + p.times_correct, 0);
    stats.accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;

    // Group by language and difficulty
    data.forEach(progress => {
      const lang = progress.vocabulary_words.language;
      const diff = progress.vocabulary_words.difficulty_level;
      
      stats.by_language[lang] = (stats.by_language[lang] || 0) + 1;
      stats.by_difficulty[diff] = (stats.by_difficulty[diff] || 0) + 1;
    });
  }

  return stats;
};

// Update vocabulary progress after review
export const updateVocabularyProgress = async (
  wordId: string,
  isCorrect: boolean,
  difficultyRating: number = 3
) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { error } = await supabase.rpc('update_vocabulary_progress', {
    p_user_id: currentUser.user.id,
    p_word_id: wordId,
    p_is_correct: isCorrect,
    p_difficulty_rating: difficultyRating
  });

  if (error) {
    console.error('Error updating vocabulary progress:', error);
    throw error;
  }
};

// Add new vocabulary word from episode
export const addVocabularyFromEpisode = async (
  word: string,
  definition: string,
  language: string,
  episodeId: string,
  translation?: string,
  difficultyLevel: string = 'beginner'
) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  // First, check if word already exists
  const { data: existingWord } = await supabase
    .from('vocabulary_words')
    .select('id')
    .eq('word', word.toLowerCase())
    .eq('language', language)
    .maybeSingle();

  let wordId: string;

  if (existingWord) {
    wordId = existingWord.id;
  } else {
    // Create new vocabulary word
    const { data: newWord, error: wordError } = await supabase
      .from('vocabulary_words')
      .insert({
        word: word.toLowerCase(),
        definition,
        translation,
        language,
        difficulty_level: difficultyLevel
      })
      .select('id')
      .single();

    if (wordError) throw wordError;
    wordId = newWord.id;
  }

  // Add to user's vocabulary progress if not already tracked
  const { error: progressError } = await supabase
    .from('user_vocabulary_progress')
    .upsert({
      user_id: currentUser.user.id,
      word_id: wordId,
      episode_id: episodeId,
      mastery_level: 0,
      times_seen: 0,
      times_correct: 0,
      next_review_date: new Date().toISOString()
    }, {
      onConflict: 'user_id,word_id'
    });

  if (progressError) throw progressError;

  return wordId;
};

// Get vocabulary words by language and difficulty
export const getVocabularyByLevel = async (
  language: string,
  difficultyLevel: string,
  limit: number = 50
): Promise<VocabularyWord[]> => {
  const { data, error } = await supabase
    .from('vocabulary_words')
    .select('*')
    .eq('language', language)
    .eq('difficulty_level', difficultyLevel)
    .order('frequency_rank', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

// Search vocabulary words
export const searchVocabulary = async (
  query: string,
  language: string
): Promise<VocabularyWord[]> => {
  const { data, error } = await supabase
    .from('vocabulary_words')
    .select('*')
    .eq('language', language)
    .or(`word.ilike.%${query}%,definition.ilike.%${query}%`)
    .limit(20);

  if (error) throw error;
  return data || [];
};

// Get user's vocabulary progress for specific words
export const getUserVocabularyProgress = async (
  wordIds: string[]
): Promise<VocabularyProgress[]> => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_vocabulary_progress')
    .select(`
      *,
      vocabulary_words(*)
    `)
    .eq('user_id', currentUser.user.id)
    .in('word_id', wordIds);

  if (error) throw error;
  return data || [];
};