import { supabase } from "@/integrations/supabase/client";

export interface PodcastSource {
  id: string;
  title: string;
  description: string;
  rss_url: string;
  language: string;
  category: string;
  difficulty_level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
  spotify_chart_rank: number;
  is_public: boolean;
  thumbnail_url: string;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisode {
  id: string;
  podcast_source_id: string;
  title: string;
  description: string;
  episode_url: string;
  audio_url: string;
  duration: number;
  publish_date: string;
  transcript: string;
  transcript_language: string;
  episode_number: number;
  season_number: number;
  created_at: string;
  updated_at: string;
  podcast_source?: PodcastSource;
}

// Helper to query untyped tables (podcast tables not in generated types)
const fromUntyped = (table: string) => (supabase as any).from(table);

// Get podcasts by language and difficulty
export const getPodcastsByLanguage = async (
  language: string,
  difficulty?: string
): Promise<PodcastSource[]> => {
  let query = fromUntyped('podcast_sources')
    .select('*')
    .eq('language', language)
    .eq('is_public', true)
    .order('spotify_chart_rank', { ascending: true });

  if (difficulty) {
    query = query.eq('difficulty_level', difficulty);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching podcasts:', error);
    throw error;
  }

  return (data || []) as PodcastSource[];
};

// Get episodes for a specific podcast
export const getPodcastEpisodes = async (
  podcastSourceId: string,
  limit: number = 10
): Promise<PodcastEpisode[]> => {
  const { data, error } = await fromUntyped('podcast_episodes')
    .select(`
      *,
      podcast_source:podcast_sources(*)
    `)
    .eq('podcast_source_id', podcastSourceId)
    .order('publish_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching episodes:', error);
    throw error;
  }

  return (data || []) as PodcastEpisode[];
};

// Get single episode with source details
export const getEpisodeById = async (episodeId: string): Promise<PodcastEpisode | null> => {
  const { data, error } = await fromUntyped('podcast_episodes')
    .select(`
      *,
      podcast_source:podcast_sources(*)
    `)
    .eq('id', episodeId)
    .single();

  if (error) {
    console.error('Error fetching episode:', error);
    throw error;
  }

  return data as PodcastEpisode;
};

// Search podcasts across all languages
export const searchPodcasts = async (
  query: string,
  language?: string
): Promise<PodcastSource[]> => {
  let searchQuery = fromUntyped('podcast_sources')
    .select('*')
    .eq('is_public', true)
    .or(`title.ilike.%${query}%, description.ilike.%${query}%`)
    .order('spotify_chart_rank', { ascending: true });

  if (language) {
    searchQuery = searchQuery.eq('language', language);
  }

  const { data, error } = await searchQuery;

  if (error) {
    console.error('Error searching podcasts:', error);
    throw error;
  }

  return (data || []) as PodcastSource[];
};

// Update user's podcast progress
export const updateEpisodeProgress = async (
  episodeId: string,
  progressPercentage: number,
  lastPosition: number,
  isCompleted: boolean = false
) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_episode_progress')
    .upsert({
      user_id: currentUser.user.id,
      episode_id: episodeId,
      progress_percentage: progressPercentage,
      last_position: lastPosition,
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null
    }, {
      onConflict: 'user_id,episode_id'
    });

  if (error) {
    console.error('Error updating episode progress:', error);
    throw error;
  }
};

// Get user's progress for an episode
export const getUserEpisodeProgress = async (episodeId: string) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) return null;

  const { data, error } = await supabase
    .from('user_episode_progress')
    .select('*')
    .eq('user_id', currentUser.user.id)
    .eq('episode_id', episodeId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching user progress:', error);
    return null;
  }

  return data;
};
