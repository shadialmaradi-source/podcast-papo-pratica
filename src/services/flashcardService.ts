import { supabase } from "@/integrations/supabase/client";
import type { FlashcardExportData } from "@/services/pdfGeneratorService";

// Types for user-created flashcards
export interface UserCreatedFlashcard {
  id: string;
  user_id: string;
  video_id: string;
  phrase: string;
  translation: string | null;
  part_of_speech: string | null;
  example_sentence: string | null;
  notes: string | null;
  source_timestamp: string | null;
  created_at: string;
  updated_at: string;
  is_mastered: boolean;
  times_reviewed: number;
  video_title?: string;
  video_language?: string;
}

export interface CreateFlashcardData {
  phrase: string;
  translation?: string;
  partOfSpeech?: string;
  exampleSentence?: string;
  notes?: string;
  sourceTimestamp?: string;
}

/**
 * Get all flashcards for PDF export with video titles
 */
export async function getFlashcardsForExport(userId: string): Promise<FlashcardExportData[]> {
  try {
    // Fetch user's viewed flashcards with the flashcard data and video info
    const { data, error } = await supabase
      .from('user_viewed_flashcards')
      .select(`
        flashcard_id,
        video_id,
        youtube_flashcards (
          id,
          phrase,
          translation,
          why,
          difficulty
        ),
        youtube_videos (
          title,
          language
        )
      `)
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching flashcards for export:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Transform the data into the export format
    const flashcards: FlashcardExportData[] = data
      .filter(item => item.youtube_flashcards) // Filter out items without flashcard data
      .map(item => ({
        id: item.youtube_flashcards!.id,
        phrase: item.youtube_flashcards!.phrase,
        translation: item.youtube_flashcards!.translation,
        why: item.youtube_flashcards!.why,
        difficulty: item.youtube_flashcards!.difficulty,
        videoTitle: item.youtube_videos?.title || 'Unknown Video',
        language: item.youtube_videos?.language || 'unknown',
      }));

    return flashcards;
  } catch (error) {
    console.error('Error in getFlashcardsForExport:', error);
    return [];
  }
}

/**
 * Save viewed flashcards to the user's flashcard repository
 * This function is called when a user views flashcards after completing a video lesson
 */
export async function saveViewedFlashcards(
  userId: string,
  videoId: string
): Promise<void> {
  try {
    // Get all flashcards for this video from the database
    const { data: flashcards, error: flashcardsError } = await supabase
      .from('youtube_flashcards')
      .select('id')
      .eq('video_id', videoId);

    if (flashcardsError) {
      console.error('Error fetching flashcards for saving:', flashcardsError);
      return;
    }

    if (!flashcards || flashcards.length === 0) {
      console.log('No flashcards to save for video:', videoId);
      return;
    }

    // Prepare records for upsert
    const records = flashcards.map(fc => ({
      user_id: userId,
      flashcard_id: fc.id,
      video_id: videoId,
      first_viewed_at: new Date().toISOString(),
      last_reviewed_at: new Date().toISOString(),
      times_reviewed: 1,
      is_mastered: false,
    }));

    // Upsert - insert new records or update existing ones
    const { error: upsertError } = await supabase
      .from('user_viewed_flashcards')
      .upsert(records, {
        onConflict: 'user_id,flashcard_id',
        ignoreDuplicates: false,
      });

    if (upsertError) {
      console.error('Error saving viewed flashcards:', upsertError);
      return;
    }

    console.log(`Saved ${flashcards.length} flashcards to user repository`);
  } catch (error) {
    console.error('Error in saveViewedFlashcards:', error);
  }
}

/**
 * Get the count of flashcards for a user
 */
export async function getFlashcardCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_viewed_flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting flashcard count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getFlashcardCount:', error);
    return 0;
  }
}

/**
 * Mark a flashcard as mastered
 */
export async function markFlashcardMastered(
  userId: string,
  flashcardId: string,
  isMastered: boolean
): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_viewed_flashcards')
      .update({ is_mastered: isMastered })
      .eq('user_id', userId)
      .eq('flashcard_id', flashcardId);

    if (error) {
      console.error('Error marking flashcard as mastered:', error);
    }
  } catch (error) {
    console.error('Error in markFlashcardMastered:', error);
  }
}

/**
 * Create a flashcard from transcript selection
 */
export async function createFlashcardFromTranscript(
  userId: string,
  videoId: string,
  data: CreateFlashcardData
): Promise<{ success: boolean; error?: string; flashcard?: UserCreatedFlashcard }> {
  try {
    // Check if phrase already exists for this user and video
    const existingPhrase = await isPhraseSaved(userId, videoId, data.phrase);
    if (existingPhrase) {
      return { success: false, error: 'This phrase is already saved!' };
    }

    const { data: flashcard, error } = await supabase
      .from('user_created_flashcards')
      .insert({
        user_id: userId,
        video_id: videoId,
        phrase: data.phrase,
        translation: data.translation || null,
        part_of_speech: data.partOfSpeech || null,
        example_sentence: data.exampleSentence || null,
        notes: data.notes || null,
        source_timestamp: data.sourceTimestamp || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating flashcard:', error);
      return { success: false, error: error.message };
    }

    return { success: true, flashcard };
  } catch (error) {
    console.error('Error in createFlashcardFromTranscript:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Get user's created flashcards, optionally filtered by video
 */
export async function getUserCreatedFlashcards(
  userId: string,
  videoId?: string
): Promise<UserCreatedFlashcard[]> {
  try {
    let query = supabase
      .from('user_created_flashcards')
      .select(`
        *,
        youtube_videos (
          title,
          language
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (videoId) {
      query = query.eq('video_id', videoId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching user created flashcards:', error);
      return [];
    }

    return (data || []).map((item: any) => ({
      ...item,
      video_title: item.youtube_videos?.title,
      video_language: item.youtube_videos?.language,
    }));
  } catch (error) {
    console.error('Error in getUserCreatedFlashcards:', error);
    return [];
  }
}

/**
 * Check if a phrase is already saved for a video
 */
export async function isPhraseSaved(
  userId: string,
  videoId: string,
  phrase: string
): Promise<boolean> {
  try {
    const normalizedPhrase = phrase.toLowerCase().trim();
    
    const { data, error } = await supabase
      .from('user_created_flashcards')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error checking if phrase is saved:', error);
      return false;
    }

    // Check for approximate match (case-insensitive)
    if (data && data.length > 0) {
      // Fetch all phrases for this video and compare
      const { data: phrases } = await supabase
        .from('user_created_flashcards')
        .select('phrase')
        .eq('user_id', userId)
        .eq('video_id', videoId);

      if (phrases) {
        return phrases.some(
          (p) => p.phrase.toLowerCase().trim() === normalizedPhrase
        );
      }
    }

    return false;
  } catch (error) {
    console.error('Error in isPhraseSaved:', error);
    return false;
  }
}

/**
 * Get saved phrases for highlighting in transcript
 */
export async function getSavedPhrasesForVideo(
  userId: string,
  videoId: string
): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_created_flashcards')
      .select('phrase')
      .eq('user_id', userId)
      .eq('video_id', videoId);

    if (error) {
      console.error('Error fetching saved phrases:', error);
      return [];
    }

    return (data || []).map((item) => item.phrase);
  } catch (error) {
    console.error('Error in getSavedPhrasesForVideo:', error);
    return [];
  }
}

/**
 * Get count of user-created flashcards
 */
export async function getUserCreatedFlashcardCount(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('user_created_flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) {
      console.error('Error getting user created flashcard count:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in getUserCreatedFlashcardCount:', error);
    return 0;
  }
}

/**
 * Update a user-created flashcard
 */
export async function updateUserCreatedFlashcard(
  userId: string,
  flashcardId: string,
  data: Partial<CreateFlashcardData & { is_mastered?: boolean }>
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: Record<string, unknown> = {};
    
    if (data.phrase !== undefined) updateData.phrase = data.phrase;
    if (data.translation !== undefined) updateData.translation = data.translation;
    if (data.partOfSpeech !== undefined) updateData.part_of_speech = data.partOfSpeech;
    if (data.exampleSentence !== undefined) updateData.example_sentence = data.exampleSentence;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.is_mastered !== undefined) updateData.is_mastered = data.is_mastered;

    const { error } = await supabase
      .from('user_created_flashcards')
      .update(updateData)
      .eq('id', flashcardId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error updating flashcard:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in updateUserCreatedFlashcard:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

/**
 * Delete a user-created flashcard
 */
export async function deleteUserCreatedFlashcard(
  userId: string,
  flashcardId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('user_created_flashcards')
      .delete()
      .eq('id', flashcardId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting flashcard:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteUserCreatedFlashcard:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
