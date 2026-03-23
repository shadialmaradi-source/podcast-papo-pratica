import { supabase } from "@/integrations/supabase/client";
import { normalizeLanguageCode } from "@/utils/languageUtils";

// Simple in-memory session cache (cleared naturally on page navigation)
const videoIdCache = new Map<string, string | null>();
const transcriptCache = new Map<string, { language: string; transcript: string }>();

/**
 * Seeds the video ID cache so downstream consumers (exercises, speaking, flashcards)
 * get a cache hit instead of re-querying youtube_videos.
 */
export function seedVideoIdCache(youtubeVideoId: string, dbId: string): void {
  videoIdCache.set(youtubeVideoId, dbId);
  // Also seed the reverse lookup so .eq('id', dbId) paths hit cache too
  videoIdCache.set(dbId, dbId);
}

/**
 * Resolves a DB video UUID from a YouTube video_id or direct UUID.
 * Caches results for the session to avoid repeated lookups.
 */
export async function resolveDbVideoId(videoId: string): Promise<string | null> {
  if (videoIdCache.has(videoId)) return videoIdCache.get(videoId)!;

  let { data } = await supabase
    .from('youtube_videos')
    .select('id')
    .eq('video_id', videoId)
    .single();

  if (!data) {
    const { data: byId } = await supabase
      .from('youtube_videos')
      .select('id')
      .eq('id', videoId)
      .single();
    data = byId;
  }

  const resolved = data?.id || null;
  videoIdCache.set(videoId, resolved);
  return resolved;
}

/**
 * Resolves transcript metadata (language + transcript text) for a DB video ID.
 * Caches results for the session.
 */
export async function resolveTranscriptMeta(
  dbVideoId: string
): Promise<{ language: string; transcript: string } | null> {
  if (transcriptCache.has(dbVideoId)) return transcriptCache.get(dbVideoId)!;

  const { data } = await supabase
    .from('youtube_transcripts')
    .select('transcript, language')
    .eq('video_id', dbVideoId)
    .maybeSingle();

  if (!data?.transcript) return null;

  const result = {
    language: normalizeLanguageCode(data.language || 'english'),
    transcript: data.transcript,
  };
  transcriptCache.set(dbVideoId, result);
  return result;
}
