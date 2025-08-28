import { supabase } from "@/integrations/supabase/client";

export interface Exercise {
  id: string;
  podcast_id: string;
  question: string;
  exercise_type: 'multiple_choice' | 'fill_blank' | 'vocabulary' | 'reflection';
  options?: any;
  difficulty: string;
  xp_reward: number;
  order_index: number;
}

export interface ExerciseResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  xp_reward: number;
}

// Secure function to get exercises without exposing correct answers
export const getPodcastExercises = async (podcastId: string): Promise<Exercise[]> => {
  const { data, error } = await supabase.rpc('get_podcast_exercises', {
    podcast_id_param: podcastId
  });

  if (error) {
    console.error('Error fetching exercises:', error);
    throw error;
  }

  return (data || []).map((exercise: any) => ({
    ...exercise,
    exercise_type: exercise.exercise_type as 'multiple_choice' | 'fill_blank' | 'vocabulary' | 'reflection'
  }));
};

// Secure function to check exercise answers
export const checkExerciseAnswer = async (
  exerciseId: string, 
  userAnswer: string
): Promise<ExerciseResult> => {
  const { data, error } = await supabase.rpc('check_exercise_answer', {
    exercise_id_param: exerciseId,
    user_answer_param: userAnswer
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
  podcastId: string,
  userAnswer: string,
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
      podcast_id: podcastId,
      user_answer: userAnswer,
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
    .select('total_xp, hearts')
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

// Decrease hearts when wrong answer
export const decreaseHearts = async () => {
  const { data: currentUser } = await supabase.auth.getUser();
  if (!currentUser.user) throw new Error('User not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('hearts')
    .eq('user_id', currentUser.user.id)
    .single();

  if (!profile) throw new Error('Profile not found');

  const newHearts = Math.max(0, profile.hearts - 1);

  const { error } = await supabase
    .from('profiles')
    .update({ hearts: newHearts })
    .eq('user_id', currentUser.user.id);

  if (error) {
    console.error('Error decreasing hearts:', error);
    throw error;
  }

  return newHearts;
};