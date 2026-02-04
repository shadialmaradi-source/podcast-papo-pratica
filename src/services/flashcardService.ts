import { supabase } from "@/integrations/supabase/client";
import type { FlashcardExportData } from "@/services/pdfGeneratorService";

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
