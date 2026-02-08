import { supabase } from "@/integrations/supabase/client";

export interface LearningWeek {
  id: string;
  level: string;
  week_number: number;
  title: string;
  description: string;
  cefr_level: string;
  language: string;
  order_index: number;
  total_videos: number;
  is_locked_by_default: boolean;
  created_at: string;
}

export interface WeekProgress {
  id: string;
  user_id: string;
  week_id: string;
  videos_completed: number;
  is_unlocked: boolean;
  is_completed: boolean;
  unlocked_at: string | null;
  completed_at: string | null;
}

export interface WeekWithProgress extends LearningWeek {
  progress: WeekProgress | null;
  xp_earned: number;
}

export interface WeekVideoRow {
  id: string;
  week_id: string;
  title: string;
  youtube_url: string;
  youtube_id: string;
  duration_seconds: number;
  thumbnail_url: string | null;
  source: string;
  order_in_week: number;
  grammar_focus: string;
  vocabulary_tags: string[] | null;
  xp_reward: number;
  created_at: string;
}

export interface VideoProgress {
  id: string;
  user_id: string;
  week_video_id: string;
  status: string;
  completed_at: string | null;
  xp_earned: number;
}

export interface WeekVideoWithProgress extends WeekVideoRow {
  progress: VideoProgress | null;
  is_unlocked: boolean;
}

/**
 * Fetch all weeks for a given level and language, along with user progress.
 */
export async function fetchWeeksForLevel(
  level: string,
  language: string,
  userId: string | undefined
): Promise<WeekWithProgress[]> {
  // Fetch weeks
  const { data: weeks, error: weeksError } = await supabase
    .from("learning_weeks")
    .select("*")
    .eq("level", level)
    .eq("language", language)
    .order("order_index", { ascending: true });

  if (weeksError) throw weeksError;
  if (!weeks || weeks.length === 0) return [];

  // Fetch user progress if logged in
  let progressMap: Record<string, WeekProgress> = {};
  if (userId) {
    const weekIds = weeks.map((w) => w.id);
    const { data: progress } = await supabase
      .from("user_week_progress")
      .select("*")
      .eq("user_id", userId)
      .in("week_id", weekIds);

    if (progress) {
      progressMap = Object.fromEntries(progress.map((p) => [p.week_id, p]));
    }
  }

  // Compute XP earned per week and merge progress
  const result: WeekWithProgress[] = weeks.map((week) => {
    const prog = progressMap[week.id] || null;
    return {
      ...week,
      progress: prog,
      xp_earned: 0, // will be computed below if needed
    };
  });

  // For weeks with progress, compute XP from completed videos
  if (userId) {
    const weeksWithProgress = result.filter((w) => w.progress && w.progress.videos_completed > 0);
    if (weeksWithProgress.length > 0) {
      const { data: videoProgress } = await supabase
        .from("user_video_progress")
        .select("xp_earned, week_video_id")
        .eq("user_id", userId)
        .eq("status", "completed");

      if (videoProgress) {
        // Get all week_video ids to map them to weeks
        const { data: weekVideos } = await supabase
          .from("week_videos")
          .select("id, week_id, xp_reward")
          .in("week_id", weeksWithProgress.map((w) => w.id));

        if (weekVideos) {
          const videoToWeek = Object.fromEntries(weekVideos.map((v) => [v.id, v.week_id]));
          const xpByWeek: Record<string, number> = {};
          
          for (const vp of videoProgress) {
            const weekId = videoToWeek[vp.week_video_id];
            if (weekId) {
              xpByWeek[weekId] = (xpByWeek[weekId] || 0) + (vp.xp_earned || 0);
            }
          }

          for (const week of result) {
            if (xpByWeek[week.id]) {
              week.xp_earned = xpByWeek[week.id];
            }
          }
        }
      }
    }
  }

  return result;
}

/**
 * Initialize user progress for week 1 (auto-unlock).
 */
export async function initializeWeek1Progress(userId: string, weekId: string): Promise<void> {
  const { error } = await supabase
    .from("user_week_progress")
    .upsert(
      {
        user_id: userId,
        week_id: weekId,
        is_unlocked: true,
        unlocked_at: new Date().toISOString(),
        videos_completed: 0,
        is_completed: false,
      },
      { onConflict: "user_id,week_id" }
    );

  if (error) {
    console.error("Error initializing week 1 progress:", error);
  }
}

/**
 * Determine the effective unlock state for each week.
 * Week 1 is always unlocked. Subsequent weeks depend on user_week_progress.
 */
export function getEffectiveWeekState(
  week: WeekWithProgress,
  allWeeks: WeekWithProgress[]
): "completed" | "in_progress" | "locked" {
  // Week 1 (not locked by default) is always at least in_progress
  if (!week.is_locked_by_default) {
    if (week.progress?.is_completed) return "completed";
    return "in_progress";
  }

  // For locked-by-default weeks, check if unlocked in user_week_progress
  if (week.progress?.is_completed) return "completed";
  if (week.progress?.is_unlocked) return "in_progress";

  return "locked";
}

/**
 * Fetch videos for a specific week with user progress.
 */
export async function fetchWeekVideos(
  weekId: string,
  userId: string | undefined
): Promise<WeekVideoWithProgress[]> {
  const { data: videos, error } = await supabase
    .from("week_videos")
    .select("*")
    .eq("week_id", weekId)
    .order("order_in_week", { ascending: true });

  if (error) throw error;
  if (!videos || videos.length === 0) return [];

  let progressMap: Record<string, VideoProgress> = {};
  if (userId) {
    const videoIds = videos.map((v) => v.id);
    const { data: progress } = await supabase
      .from("user_video_progress")
      .select("*")
      .eq("user_id", userId)
      .in("week_video_id", videoIds);

    if (progress) {
      progressMap = Object.fromEntries(progress.map((p) => [p.week_video_id, p]));
    }
  }

  // Determine unlock state for each video (sequential)
  return videos.map((video, index) => {
    const prog = progressMap[video.id] || null;
    let is_unlocked = false;

    if (index === 0) {
      // First video is always unlocked if the week is unlocked
      is_unlocked = true;
    } else {
      // Subsequent videos require the previous video to be completed
      const prevVideo = videos[index - 1];
      const prevProgress = progressMap[prevVideo.id];
      is_unlocked = prevProgress?.status === "completed";
    }

    return {
      ...video,
      progress: prog,
      is_unlocked,
    };
  });
}

/**
 * Fetch a single week by ID.
 */
export async function fetchWeekById(weekId: string): Promise<LearningWeek | null> {
  const { data, error } = await supabase
    .from("learning_weeks")
    .select("*")
    .eq("id", weekId)
    .single();

  if (error) {
    console.error("Error fetching week:", error);
    return null;
  }
  return data;
}

/**
 * Complete a video: update progress, XP, streak, and potentially unlock next week.
 */
export async function completeVideo(
  userId: string,
  weekVideoId: string
): Promise<{ xpEarned: number; weekCompleted: boolean }> {
  // 1. Get video info
  const { data: video, error: videoError } = await supabase
    .from("week_videos")
    .select("*, learning_weeks(*)")
    .eq("id", weekVideoId)
    .single();

  if (videoError || !video) throw videoError || new Error("Video not found");

  const xpReward = video.xp_reward;
  const week = video.learning_weeks as unknown as LearningWeek;

  // 2. Upsert video progress
  const { error: progressError } = await supabase
    .from("user_video_progress")
    .upsert(
      {
        user_id: userId,
        week_video_id: weekVideoId,
        status: "completed",
        completed_at: new Date().toISOString(),
        xp_earned: xpReward,
      },
      { onConflict: "user_id,week_video_id" }
    );

  if (progressError) throw progressError;

  // 3. Count completed videos in this week
  const { data: allWeekVideos } = await supabase
    .from("week_videos")
    .select("id")
    .eq("week_id", week.id);

  const allVideoIds = allWeekVideos?.map((v) => v.id) || [];

  const { data: completedVideos } = await supabase
    .from("user_video_progress")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "completed")
    .in("week_video_id", allVideoIds);

  const completedCount = completedVideos?.length || 0;
  const threshold = Math.ceil(week.total_videos * 0.8);
  const weekCompleted = completedCount >= threshold;

  // 4. Update week progress
  const { error: weekError } = await supabase
    .from("user_week_progress")
    .upsert(
      {
        user_id: userId,
        week_id: week.id,
        videos_completed: completedCount,
        is_completed: weekCompleted,
        is_unlocked: true,
        completed_at: weekCompleted ? new Date().toISOString() : null,
      },
      { onConflict: "user_id,week_id" }
    );

  if (weekError) throw weekError;

  // 5. If week completed, unlock next week
  if (weekCompleted) {
    const { data: nextWeek } = await supabase
      .from("learning_weeks")
      .select("id")
      .eq("level", week.level)
      .eq("language", week.language)
      .eq("week_number", week.week_number + 1)
      .single();

    if (nextWeek) {
      await supabase
        .from("user_week_progress")
        .upsert(
          {
            user_id: userId,
            week_id: nextWeek.id,
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
            videos_completed: 0,
            is_completed: false,
          },
          { onConflict: "user_id,week_id" }
        );
    }
  }

  // 6. Add XP to profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("total_xp")
    .eq("user_id", userId)
    .single();

  if (profile) {
    await supabase
      .from("profiles")
      .update({ total_xp: (profile.total_xp || 0) + xpReward })
      .eq("user_id", userId);
  }

  // 7. Update streak
  const today = new Date().toISOString().split("T")[0];
  const { data: streakData } = await supabase
    .from("user_streak_data")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (streakData) {
    const lastDate = streakData.last_activity_date;
    let newStreak = streakData.current_streak;

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      if (lastDate === yesterdayStr) {
        newStreak += 1;
      } else if (lastDate !== today) {
        newStreak = 1;
      }
    }

    await supabase
      .from("user_streak_data")
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, streakData.longest_streak),
        last_activity_date: today,
      })
      .eq("user_id", userId);
  }

  // 8. Log activity
  await supabase.from("user_activity_history").insert({
    user_id: userId,
    activity_type: "learning_path_video",
    xp_earned: xpReward,
    activity_data: {
      week_video_id: weekVideoId,
      week_id: week.id,
      week_title: week.title,
      video_title: video.title,
    },
  });

  return { xpEarned: xpReward, weekCompleted };
}

/**
 * Format seconds into a human-readable duration string.
 */
export function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes === 0) return `${secs}s`;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}
