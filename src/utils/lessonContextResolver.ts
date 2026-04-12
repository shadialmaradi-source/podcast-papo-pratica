import { supabase } from "@/integrations/supabase/client";
import { normalizeLanguageCode } from "@/utils/languageUtils";

interface ResolveLessonContextOptions {
  videoId: string;
  sceneTranscript?: string;
}

export interface LessonContext {
  dbVideoId: string;
  transcript: string;
  transcriptLanguage: string;
}

const dbVideoIdCache = new Map<string, string>();
const transcriptCache = new Map<string, { transcript: string; language: string }>();

const resolveDbVideoId = async (videoId: string): Promise<string | null> => {
  const cached = dbVideoIdCache.get(videoId);
  if (cached) return cached;

  let { data: videoData } = await supabase
    .from("youtube_videos")
    .select("id")
    .eq("video_id", videoId)
    .single();

  if (!videoData) {
    const { data: videoById } = await supabase
      .from("youtube_videos")
      .select("id")
      .eq("id", videoId)
      .single();
    videoData = videoById;
  }

  if (!videoData?.id) return null;

  dbVideoIdCache.set(videoId, videoData.id);
  dbVideoIdCache.set(videoData.id, videoData.id);
  return videoData.id;
};

const resolveTranscriptMeta = async (dbVideoId: string) => {
  const cached = transcriptCache.get(dbVideoId);
  if (cached) return cached;

  const { data: transcriptData } = await supabase
    .from("youtube_transcripts")
    .select("transcript, language")
    .eq("video_id", dbVideoId)
    .maybeSingle();

  const resolved = {
    transcript: transcriptData?.transcript || "",
    language: normalizeLanguageCode(transcriptData?.language || "english"),
  };

  transcriptCache.set(dbVideoId, resolved);
  return resolved;
};

export const resolveLessonContext = async ({
  videoId,
  sceneTranscript,
}: ResolveLessonContextOptions): Promise<LessonContext | null> => {
  const dbVideoId = await resolveDbVideoId(videoId);
  if (!dbVideoId) return null;

  const transcriptMeta = await resolveTranscriptMeta(dbVideoId);
  const transcript = sceneTranscript || transcriptMeta.transcript;

  return {
    dbVideoId,
    transcript,
    transcriptLanguage: transcriptMeta.language,
  };
};

