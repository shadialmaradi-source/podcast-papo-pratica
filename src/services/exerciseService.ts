import { supabase } from "@/integrations/supabase/client";

export interface Exercise {
  id: string;
  episode_id: string;
  question: string;
  exercise_type: 'multiple_choice' | 'true_false' | 'matching' | 'sequencing' | 'gap_fill' | 'fill_blank' | 'vocabulary' | 'reflection' | 'analysis' | 'synthesis' | 'comprehension' | 'reorder';
  options?: any;
  difficulty: string;
  intensity: string;
  xp_reward: number;
  order_index: number;
  correct_answer?: string;
  explanation?: string;
}

export interface ExerciseResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_reward: number;
}

// Secure function to get exercises without exposing correct answers
export const getEpisodeExercises = async (
  episodeId: string, 
  difficulty?: string, 
  intensity?: string
): Promise<Exercise[]> => {
  const { data, error } = await supabase.rpc('get_episode_exercises', {
    episode_id_param: episodeId,
    difficulty_param: difficulty,
    intensity_param: intensity
  });

  if (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }

  return (data || []).map((exercise: any) => ({
    ...exercise,
    exercise_type: exercise.exercise_type as 'multiple_choice' | 'true_false' | 'matching' | 'sequencing' | 'gap_fill' | 'fill_blank' | 'vocabulary' | 'reflection' | 'analysis' | 'synthesis' | 'comprehension' | 'reorder'
  }));
};

// Secure function to check exercise answers
export const checkExerciseAnswer = async (
  exerciseId: string, 
  userAnswer: string | any[]
): Promise<ExerciseResult> => {
  // Convert arrays to JSON string for database function
  const answerParam = typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer);
  
  const { data, error } = await supabase.rpc('check_exercise_answer', {
    exercise_id_param: exerciseId,
    user_answer_param: answerParam
  });

  if (error) {
    console.error('Error checking answer:', error);
    throw error;
  }

  return data?.[0] || { is_correct: false, correct_answer: '', explanation: '', xp_reward: 0 };
};

// Save user exercise result
export const saveExerciseResult = async (
  exerciseId: string,
  episodeId: string,
  userAnswer: string | any[],
  isCorrect: boolean,
  xpEarned: number
) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_exercise_results')
    .upsert({
      user_id: currentUser.user.id,
      exercise_id: exerciseId,
      episode_id: episodeId,
      user_answer: typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer),
      is_correct: isCorrect,
      xp_earned: xpEarned,
      attempts: 1
    }, {
      onConflict: 'user_id,exercise_id'
    });

  if (error) {
    console.error('Error saving exercise result:', error);
    throw error;
  }
};

// Update user XP and progress
export const updateUserProgress = async (xpToAdd: number) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  // Get current profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_xp')
    .eq('user_id', currentUser.user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  // Update XP
  const { error } = await supabase
    .from('profiles')
    .update({
      total_xp: profile.total_xp + xpToAdd
    })
    .eq('user_id', currentUser.user.id);

  if (error) {
    console.error('Error updating user progress:', error);
    throw error;
  }

  // Update today's activity
  const today = new Date().toISOString().split('T')[0];
  await supabase
    .from('daily_activities')
    .upsert({
      user_id: currentUser.user.id,
      activity_date: today,
      xp_earned_today: xpToAdd
    }, {
      onConflict: 'user_id,activity_date'
    });
};

// Mark episode as completed
export const markEpisodeCompleted = async (episodeId: string) => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('user_episode_progress')
    .upsert({
      user_id: currentUser.user.id,
      episode_id: episodeId,
      is_completed: true,
      completed_at: new Date().toISOString(),
      progress_percentage: 100
    }, {
      onConflict: 'user_id,episode_id'
    });

  if (error) {
    console.error('Error marking episode as completed:', error);
    throw error;
  }
};

// Get next episode suggestions
export const getNextEpisodeSuggestions = async (currentEpisodeId: string, language: string) => {
  const { data, error } = await supabase.rpc('get_next_episode', {
    current_episode_id: currentEpisodeId,
    language_param: language
  });

  if (error) {
    console.error('Error getting next episode suggestions:', error);
    throw error;
  }

  return data?.[0] || null;
};